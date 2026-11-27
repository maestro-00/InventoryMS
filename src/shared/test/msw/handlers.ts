import { http, HttpResponse } from "msw";
import {
  authSessionFixture,
  productFixture,
  rfc7807Problem,
  stockFixture,
} from "../../../../tests/fixtures/domain";
import { billingPlansFixture } from "../../../../tests/fixtures/billing-plans";
import { ownerSession } from "../../../../tests/fixtures/provider/session";

const origin = "*" as const;

export const handlers = [
  http.post(`${origin}/api/v1/auth/login`, () =>
    HttpResponse.json({
      requiresTwoFactor: false,
      accessToken: "test-access",
      refreshToken: "test-refresh",
      accessTokenExpiresAt: authSessionFixture.expiresAt,
    }),
  ),
  http.post(`${origin}/api/v1/auth/refresh`, () =>
    HttpResponse.json({
      accessToken: "test-access-next",
      refreshToken: "test-refresh-next",
      accessTokenExpiresAt: authSessionFixture.expiresAt,
    }),
  ),
  http.get(`${origin}/api/v1/products`, () =>
    HttpResponse.json({
      items: [productFixture],
      page: 1,
      pageSize: 50,
      totalCount: 1,
    }),
  ),
  http.get(`${origin}/api/v1/stock`, () =>
    HttpResponse.json({
      items: [stockFixture],
      page: 1,
      pageSize: 50,
      totalCount: 1,
    }),
  ),
  http.post(`${origin}/api/v1/products`, () =>
    HttpResponse.json(rfc7807Problem, {
      status: 400,
      headers: { "Content-Type": "application/problem+json" },
    }),
  ),
  http.get(`${origin}/api/v1/tenant`, () => HttpResponse.json(ownerSession)),
  http.get(`${origin}/api/v1/billing/plans`, () =>
    HttpResponse.json(billingPlansFixture),
  ),
  http.get(`${origin}/api/v2/billing/plans`, () =>
    HttpResponse.json(billingPlansFixture),
  ),
  http.get(`${origin}/api/v2/billing/payment-methods`, () => HttpResponse.json([])),
  http.get(`${origin}/api/v2/billing/payment-methods/quote`, () =>
    HttpResponse.json({ baseAmount: 1, taxAmount: 0, totalAmount: 1, currency: "GHS" }),
  ),
  http.get(`${origin}/api/v2/billing/subscription`, () =>
    HttpResponse.json({
      id: "11111111-1111-4111-8111-111111111111",
      plan: "Free",
      status: "Active",
      billingCycle: "Monthly",
      currentPeriodStart: "2026-11-01T00:00:00Z",
      currentPeriodEnd: "2026-12-01T00:00:00Z",
      trialEndsAt: null,
      usage: [],
    }),
  ),
  http.post(`${origin}/api/v2/billing/quotes`, () =>
    HttpResponse.json({
      quoteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      currency: "GHS",
      baseAmount: 2390,
      taxAmount: 0,
      totalAmount: 2390,
      prorationCredit: 0,
      effectiveAt: "2026-11-26T12:00:00Z",
      nextRenewalAt: "2027-11-26T12:00:00Z",
      nextRenewalTotal: 2390,
      exceededLimits: [],
      requiresAcknowledgement: false,
    }),
  ),
  http.post(`${origin}/api/v2/billing/payment-intents`, async ({ request }) => {
    const body = (await request.json()) as { methodKind?: string };
    const card = body.methodKind === "card";
    return HttpResponse.json(
      {
        intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        status: card ? "pending" : "awaiting_approval",
        authorizationUrl: card ? "https://checkout.paystack.com/mock-checkout" : null,
        approvalMessage: card ? null : "Approve the payment on your phone",
        pollAfterSeconds: 5,
      },
      { status: card ? 201 : 202 },
    );
  }),
  http.get(`${origin}/api/v2/billing/payment-intents/:id`, () =>
    HttpResponse.json({
      intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "pending",
      pollAfterSeconds: 5,
    }),
  ),
  http.get(`${origin}/api/v1/registers/:registerId/favourites`, () =>
    HttpResponse.json({
      registerId: "88888888-8888-4888-8888-888888888888",
      layoutJson: "{}",
    }),
  ),
  http.get(`${origin}/api/v1/sales/held`, () => HttpResponse.json([])),
];
