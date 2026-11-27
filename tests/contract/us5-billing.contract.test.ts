import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import {
  createBillingQuote,
  createPaymentIntent,
  fetchPaymentIntentStatus,
  fetchInvoices,
  fetchPlans,
  fetchSubscription,
  fetchPaymentMethods,
  fetchMethodVerificationQuote,
  replacePaymentMethod,
  downloadInvoicePdf,
  createSubscriptionQuote,
  scheduleSubscriptionChange,
  reverseSubscriptionChange,
  startRecovery,
} from "../../src/features/billing/api/billing-queries";
import { billingPlansFixture } from "../fixtures/billing-plans";
import { ownerSession } from "../fixtures/provider/session";
import { sessionManager } from "../../src/shared/auth/session-manager";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";
const V2_SNAPSHOT_PATH = "openapi/inventoryx-v2.json";

const US5_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/billing/plans"],
  ["get", "/api/v1/billing/subscription"],
  ["post", "/api/v1/billing/subscription/upgrade"],
  ["post", "/api/v1/billing/subscription/downgrade"],
  ["post", "/api/v1/billing/subscription/cancel"],
  ["post", "/api/v1/billing/subscription/reactivate"],
  ["post", "/api/v1/billing/payment-method"],
  ["get", "/api/v1/billing/invoices"],
  ["get", "/api/v1/billing/invoices/{id}/pdf"],
  ["patch", "/api/v1/billing/contact"],
  ["post", "/api/v1/tenant/export"],
  ["get", "/api/v1/tenant/export/{jobId}"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

describe("US5 provider contract surface", () => {
  it("captures billing and export operations", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US5_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });

  it("captures the v2 purchase contract", () => {
    const doc = JSON.parse(readFileSync(V2_SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
    for (const [method, path] of [
      ["get", "/api/v2/billing/plans"],
      ["post", "/api/v2/billing/quotes"],
      ["post", "/api/v2/billing/payment-intents"],
      ["get", "/api/v2/billing/payment-intents/{id}"],
      ["get", "/api/v2/billing/subscription"],
      ["get", "/api/v2/billing/payment-methods"],
      ["get", "/api/v2/billing/payment-methods/quote"],
      ["post", "/api/v2/billing/payment-methods"],
      ["get", "/api/v2/billing/invoices"],
      ["get", "/api/v2/billing/invoices/{id}/pdf"],
      ["patch", "/api/v2/billing/contact"],
      ["post", "/api/v2/billing/changes"],
      ["delete", "/api/v2/billing/changes/{id}"],
      ["post", "/api/v2/billing/cancellation"],
      ["delete", "/api/v2/billing/cancellation"],
      ["post", "/api/v2/billing/recovery"],
    ] as const) {
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });
});

describe("billing queries", () => {
  it("loads safe methods, starts a replacement, and downloads a PDF with authorization", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "contract-token",
      refreshToken: "contract-refresh",
    });
    const methodId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const intentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const invoiceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const requests: string[] = [];
    server.use(
      http.get("*/api/v2/billing/payment-methods", () =>
        HttpResponse.json([
          {
            id: methodId,
            kind: "card",
            status: "Active",
            provider: "paystack",
            maskedIdentifier: "**** 4242",
            brand: "Visa",
            expiryMonth: 12,
            expiryYear: 2028,
            renewalMode: "Automatic",
          },
        ]),
      ),
      http.get("*/api/v2/billing/payment-methods/quote", () =>
        HttpResponse.json({
          baseAmount: 1,
          taxAmount: 0,
          totalAmount: 1,
          currency: "GHS",
        }),
      ),
      http.post("*/api/v2/billing/payment-methods", ({ request }) => {
        requests.push(request.headers.get("Idempotency-Key") ?? "");
        return HttpResponse.json(
          {
            intentId,
            pendingMethodId: methodId,
            reference: "method-ref",
            status: "pending",
            amount: 1,
            currency: "GHS",
            authorizationUrl: "https://checkout.paystack.com/test",
            approvalMessage: null,
            pollAfterSeconds: 5,
          },
          { status: 202 },
        );
      }),
      http.get("*/api/v2/billing/invoices/:id/pdf", ({ request }) => {
        requests.push(request.headers.get("Authorization") ?? "");
        return new HttpResponse("%PDF-1.4\n%%EOF", {
          headers: { "Content-Type": "application/pdf" },
        });
      }),
    );

    expect((await fetchPaymentMethods())[0]?.maskedIdentifier).toBe("**** 4242");
    expect((await fetchMethodVerificationQuote()).totalAmount).toBe(1);
    expect(
      (
        await replacePaymentMethod(
          { channel: "card", provider: null, msisdn: null },
          "replace-key",
        )
      ).status,
    ).toBe("pending");
    expect((await downloadInvoicePdf(invoiceId)).type).toBe("application/pdf");
    expect(requests[0]).toBe("replace-key");
    expect(requests[1]).toMatch(/^Bearer /);
  });
  it("quotes a published price, starts mobile money, and polls server status", async () => {
    const quoteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const intentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    let quoteRequest: unknown;
    let intentRequest: unknown;
    const headers: string[] = [];
    server.use(
      http.post("*/api/v2/billing/quotes", async ({ request }) => {
        quoteRequest = await request.json();
        headers.push(request.headers.get("Idempotency-Key") ?? "");
        return HttpResponse.json({
          quoteId,
          expiresAt: "2026-11-26T12:15:00Z",
          currency: "GHS",
          baseAmount: 249,
          taxAmount: 0,
          totalAmount: 249,
          prorationCredit: 0,
          effectiveAt: "2026-11-26T12:00:00Z",
          nextRenewalAt: "2026-12-26T12:00:00Z",
          nextRenewalTotal: 249,
          exceededLimits: [],
          requiresAcknowledgement: false,
        });
      }),
      http.post("*/api/v2/billing/payment-intents", async ({ request }) => {
        intentRequest = await request.json();
        headers.push(request.headers.get("Idempotency-Key") ?? "");
        return HttpResponse.json(
          {
            intentId,
            status: "awaiting_approval",
            authorizationUrl: null,
            approvalMessage: "Approve on your phone",
            pollAfterSeconds: 5,
          },
          { status: 202 },
        );
      }),
      http.get("*/api/v2/billing/payment-intents/:id", () =>
        HttpResponse.json({ intentId, status: "pending", pollAfterSeconds: 5 }),
      ),
    );
    const quote = await createBillingQuote(
      {
        targetPlanId: quoteId,
        billingCycle: 0,
        purpose: 0,
      },
      "quote-action",
    );
    expect(quote.totalAmount).toBe(249);
    const intent = await createPaymentIntent(
      {
        quoteId: quote.quoteId,
        methodKind: "mobile_money",
        provider: "mtn",
        phoneNumber: "0241234567",
      },
      "purchase-action",
    );
    expect(intent.status).toBe("awaiting_approval");
    expect((await fetchPaymentIntentStatus(intent.intentId)).status).toBe("pending");
    expect(quoteRequest).toEqual({
      targetPlanId: quoteId,
      billingCycle: 0,
      purpose: 0,
    });
    expect(intentRequest).toEqual({
      quoteId,
      methodKind: "mobile_money",
      provider: "mtn",
      phoneNumber: "0241234567",
    });
    expect(headers).toEqual(["quote-action", "purchase-action"]);
  });

  it("schedules and reverses a quoted change, and starts recovery with idempotent requests", async () => {
    const quoteId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const changeId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    server.use(
      http.post("*/api/v2/billing/quotes", async ({ request }) => {
        const body = await request.json();
        calls.push({ url: "/quotes", method: "POST", body });
        return HttpResponse.json({
          quoteId,
          expiresAt: "2026-11-26T12:15:00Z",
          currency: "GHS",
          baseAmount: 249,
          taxAmount: 0,
          totalAmount: 249,
          prorationCredit: 0,
          effectiveAt: "2026-12-26T12:00:00Z",
          nextRenewalAt: "2027-01-26T12:00:00Z",
          nextRenewalTotal: 249,
          exceededLimits: ["products"],
          requiresAcknowledgement: true,
        });
      }),
      http.post("*/api/v2/billing/changes", async ({ request }) => {
        calls.push({ url: "/changes", method: "POST", body: await request.json() });
        return HttpResponse.json(
          {
            id: "11111111-1111-4111-8111-111111111111",
            plan: "Standard",
            status: "Active",
            billingCycle: "Monthly",
            currentPeriodStart: "2026-11-01T00:00:00Z",
            currentPeriodEnd: "2026-12-01T00:00:00Z",
            trialEndsAt: null,
            graceExpiresAt: null,
            cancelledAt: null,
            purgeAt: null,
            usage: [],
            canPerformPaidMutations: true,
          },
          { status: 202 },
        );
      }),
      http.delete("*/api/v2/billing/changes/:id", ({ request }) => {
        calls.push({ url: new URL(request.url).pathname, method: "DELETE" });
        return new HttpResponse(null, { status: 204 });
      }),
      http.post("*/api/v2/billing/recovery", async ({ request }) => {
        calls.push({ url: "/recovery", method: "POST", body: await request.json() });
        return HttpResponse.json(
          {
            intentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            status: "awaiting_approval",
            authorizationUrl: null,
            approvalMessage: "Approve recovery",
            pollAfterSeconds: 5,
          },
          { status: 202 },
        );
      }),
    );

    const quote = await createSubscriptionQuote({
      targetPlanId: "plan-standard",
      billingCycle: "Monthly",
      purpose: "Downgrade",
    });
    await scheduleSubscriptionChange({
      quoteId: quote.quoteId,
      acknowledgeExceededLimits: true,
    });
    await reverseSubscriptionChange(changeId);
    const recovery = await startRecovery({
      methodKind: "mobile_money",
      provider: "mtn",
      phoneNumber: "0241234567",
    });

    expect(recovery.status).toBe("awaiting_approval");
    expect(calls[1]?.body).toEqual({ quoteId, acknowledgeExceededLimits: true });
    expect(calls[2]?.url).toBe(`/api/v2/billing/changes/${changeId}`);
  });

  it("loads plans, subscription, and invoices from the provider", async () => {
    server.use(
      http.get("*/api/v2/billing/plans", () => HttpResponse.json(billingPlansFixture)),
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          id: "11111111-1111-4111-8111-111111111111",
          plan: "Professional",
          status: "Trialing",
          billingCycle: "Monthly",
          currentPeriodStart: "2026-08-01T00:00:00Z",
          currentPeriodEnd: "2026-08-15T00:00:00Z",
          trialEndsAt: "2026-08-15T00:00:00Z",
          usage: [{ metric: "salesThisMonth", current: 2, limit: 500 }],
        }),
      ),
      http.get("*/api/v2/billing/invoices", () =>
        HttpResponse.json({
          items: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              number: "INV-1",
              status: "Paid",
              amount: 49,
              taxAmount: 0,
              currency: "GHS",
              createdAt: "2026-08-01T00:00:00Z",
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    const plans = await fetchPlans();
    expect(plans).toHaveLength(billingPlansFixture.length);
    expect(plans.map((plan) => plan.name)).toEqual([
      "Free",
      "Standard",
      "Professional",
      "Business",
    ]);
    expect((await fetchSubscription()).status).toBe("Trialing");
    expect((await fetchInvoices())[0]?.number).toBe("INV-1");
  });
});
