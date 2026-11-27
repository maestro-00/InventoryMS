import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../shared/test/msw/server";
import { PlanComparison } from "./plans/plan-comparison";
import { CancellationPanel } from "./subscription/cancellation";
import { ChangePlanForm } from "./subscription/change-plan";
import { PaymentMethodForm } from "./payment-method/payment-method-form";
import { PaymentReturnStatus } from "../../routes/_authenticated/settings/billing";
import {
  DataExportPanel,
  InvoiceHistory,
  RecoveryPanel,
} from "./invoices/invoice-history";
import {
  SubscriptionGateProvider,
  useSubscriptionGate,
} from "../../app/providers/subscription-gate";
import { downloadInvoicePdf } from "./api/billing-queries";
import { billingPlansFixture } from "../../../tests/fixtures/billing-plans";
import { ownerSession } from "../../../tests/fixtures/provider/session";
import { SessionProvider } from "../../shared/auth/session-context";
import { SessionManager, sessionManager } from "../../shared/auth/session-manager";
import { selectRadixOption } from "../../shared/test/select-radix";

const subscriptionBody = {
  id: "11111111-1111-4111-8111-111111111111",
  plan: "Professional",
  status: "Trialing",
  billingCycle: "Monthly",
  currentPeriodStart: "2026-08-01T00:00:00Z",
  currentPeriodEnd: "2026-08-15T00:00:00Z",
  trialEndsAt: "2026-08-15T00:00:00Z",
  usage: [{ metric: "salesThisMonth", current: 2, limit: 500 }],
};

function renderBilling(ui: React.ReactNode) {
  const manager = new SessionManager({ origin: "http://localhost" });
  const session = {
    ...ownerSession,
    locationScope: [...ownerSession.locationScope],
    accessToken: "access",
    refreshToken: "refresh",
  };
  manager.setSession(session);
  sessionManager.setSession(session);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SessionProvider manager={manager}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SessionProvider>,
  );
}

describe("billing surfaces", () => {
  it("lets the owner choose a cycle and see the server quote before checkout", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v2/billing/plans", () => HttpResponse.json(billingPlansFixture)),
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Free",
          status: "Active",
          trialEndsAt: null,
        }),
      ),
      http.post("*/api/v2/billing/quotes", () =>
        HttpResponse.json({
          quoteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          expiresAt: "2026-11-26T12:15:00Z",
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
    );
    renderBilling(<PlanComparison />);
    await user.click(await screen.findByRole("button", { name: /annual billing/i }));
    await user.click(screen.getByRole("button", { name: /choose standard/i }));
    expect(await screen.findByText(/Total:\s*GHS\s*2,390/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue to payment/i }),
    ).toBeInTheDocument();
  });

  it("keeps mobile money purchase pending until the server confirms payment", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Free",
          status: "Active",
          trialEndsAt: null,
        }),
      ),
      http.post("*/api/v2/billing/quotes", () =>
        HttpResponse.json({
          quoteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
        }),
      ),
      http.post("*/api/v2/billing/payment-intents", () =>
        HttpResponse.json(
          {
            intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            status: "awaiting_approval",
            authorizationUrl: null,
            approvalMessage: "Approve on your phone",
            pollAfterSeconds: 5,
          },
          { status: 202 },
        ),
      ),
      http.get("*/api/v2/billing/payment-intents/:id", () =>
        HttpResponse.json({
          intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          status: "pending",
          pollAfterSeconds: 5,
        }),
      ),
    );
    renderBilling(<PlanComparison />);
    await user.click(await screen.findByRole("button", { name: /choose standard/i }));
    await user.click(
      await screen.findByRole("button", { name: /continue to payment/i }),
    );
    await selectRadixOption(
      user,
      screen.getByLabelText(/payment channel/i),
      "Ghana mobile money",
    );
    await selectRadixOption(
      user,
      screen.getByLabelText(/mobile money network/i),
      "MTN",
    );
    await user.type(screen.getByLabelText(/ghana phone number/i), "0241234567");
    await user.click(screen.getByRole("button", { name: /start payment/i }));
    expect(await screen.findByText(/approve on your phone/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting for payment confirmation/i)).toBeInTheDocument();
    expect(screen.queryByText(/payment confirmed/i)).not.toBeInTheDocument();
  });

  it("shows plan comparison, trial, and cancellation controls", async () => {
    server.use(
      http.get("*/api/v2/billing/plans", () =>
        HttpResponse.json([{ id: "pro", name: "Professional", tier: "Professional" }]),
      ),
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json(subscriptionBody),
      ),
    );
    renderBilling(
      <>
        <PlanComparison />
        <CancellationPanel />
      </>,
    );
    expect(await screen.findByText(/trial ends/i)).toBeInTheDocument();
    expect(screen.queryByText(/2026-08-15T00:00:00Z/)).not.toBeInTheDocument();
    expect(screen.getByText(/Sales this month/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 500/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel subscription/i }),
    ).toBeInTheDocument();
  });

  it("saves billing contact without accepting a payment reference", async () => {
    const user = userEvent.setup();
    let savedContact: unknown;
    server.use(
      http.patch("*/api/v2/billing/contact", async ({ request }) => {
        savedContact = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    renderBilling(<PaymentMethodForm />);
    expect(screen.queryByLabelText(/payment reference/i)).not.toBeInTheDocument();
    await screen.findByText(/verification charge:/i);
    await user.type(screen.getByLabelText(/billing email/i), "billing@kwame.gh");
    await user.type(screen.getByLabelText(/tax number/i), "C0001112223");
    expect(screen.getByLabelText(/billing email/i)).toHaveValue("billing@kwame.gh");
    await user.click(screen.getByRole("button", { name: /save billing details/i }));
    await vi.waitFor(() => {
      expect(savedContact).toMatchObject({
        billingEmail: "billing@kwame.gh",
        taxNumber: "C0001112223",
      });
    });
  });

  it("shows the active method and leaves it in place while replacement awaits approval", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v2/billing/payment-methods", () =>
        HttpResponse.json([
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
      http.post("*/api/v2/billing/payment-methods", () =>
        HttpResponse.json(
          {
            intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            pendingMethodId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            reference: "method-ref",
            status: "awaiting_approval",
            amount: 1,
            currency: "GHS",
            authorizationUrl: null,
            approvalMessage: "Approve the verification charge",
            pollAfterSeconds: 5,
          },
          { status: 202 },
        ),
      ),
      http.get("*/api/v2/billing/payment-intents/:id", () =>
        HttpResponse.json({
          intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          status: "awaiting_approval",
          pollAfterSeconds: 5,
        }),
      ),
    );
    renderBilling(<PaymentMethodForm />);
    expect(await screen.findByText(/\*\*\*\* 4242/)).toBeInTheDocument();
    expect(await screen.findByText(/verification charge:/i)).toHaveTextContent("GHS 1");
    await user.type(screen.getByLabelText(/replacement phone number/i), "0241234567");
    await user.click(
      screen.getByRole("button", { name: /verify replacement method/i }),
    );
    expect(
      await screen.findByText(/approve the verification charge/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/\*\*\*\* 4242/)).toBeInTheDocument();
    expect(screen.queryByText(/replacement confirmed/i)).not.toBeInTheDocument();
  });

  it("downloads an invoice PDF through the authenticated billing client", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:invoice");
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    let requested = false;
    server.use(
      http.get("*/api/v2/billing/invoices", () =>
        HttpResponse.json({
          items: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              number: "BILL-1",
              status: "Paid",
              amount: 30,
              taxAmount: 0,
              currency: "GHS",
              createdAt: "2026-11-26T00:00:00Z",
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.get("*/api/v2/billing/invoices/:id/pdf", ({ request }) => {
        requested = Boolean(request.headers.get("Authorization"));
        return new HttpResponse("%PDF-1.4\n%%EOF", {
          headers: { "Content-Type": "application/pdf" },
        });
      }),
    );
    renderBilling(<InvoiceHistory />);
    await user.click(await screen.findByRole("button", { name: /download pdf/i }));
    await vi.waitFor(() => {
      expect(requested).toBe(true);
    });
    expect(click).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    click.mockRestore();
    createObjectURL.mockRestore();
  });

  it("rejects an invoice download when the response is not a PDF", async () => {
    server.use(
      http.get(
        "*/api/v2/billing/invoices/:id/pdf",
        () =>
          new HttpResponse("not a PDF", {
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );
    renderBilling(<div />);
    await expect(
      downloadInvoicePdf("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).rejects.toThrow("The invoice response was not a PDF.");
  });

  it("treats a card return as pending until the server confirms the intent", async () => {
    sessionStorage.setItem(
      "billing-payment-intent",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    server.use(
      http.get("*/api/v2/billing/payment-intents/:id", () =>
        HttpResponse.json({
          intentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          status: "pending",
          pollAfterSeconds: 5,
        }),
      ),
    );
    renderBilling(<PaymentReturnStatus />);
    expect(
      await screen.findByText(/waiting for payment confirmation/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/payment confirmed/i)).not.toBeInTheDocument();
  });

  it("lists invoices and starts a data export job", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:export");
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    let downloads = 0;
    server.use(
      http.get("*/api/v2/billing/invoices", () =>
        HttpResponse.json({
          items: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              number: "INV-1",
              status: "Paid",
              amount: 120,
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
      http.post("*/api/v1/tenant/export", () =>
        HttpResponse.json({ jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
      ),
      http.get("*/api/v1/tenant/export/:jobId", () => {
        downloads += 1;
        return new HttpResponse(new Blob(["zip-data"], { type: "application/zip" }));
      }),
    );
    renderBilling(
      <>
        <InvoiceHistory />
        <DataExportPanel />
      </>,
    );
    expect(await screen.findByText(/INV-1 · Paid · .*120\.00/)).toBeInTheDocument();
    expect(
      screen.queryByText(/invalid input: expected array/i),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start export/i }));
    await user.click(await screen.findByRole("button", { name: /download export/i }));
    await vi.waitFor(() => {
      expect(click).toHaveBeenCalledOnce();
    });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(downloads).toBe(1);
  });

  it("quotes a paid plan without activating it and handles usage without limits", async () => {
    const user = userEvent.setup();
    let quoted: string | undefined;
    server.use(
      http.get("*/api/v2/billing/plans", () =>
        HttpResponse.json([billingPlansFixture[0], billingPlansFixture[2]]),
      ),
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Free",
          status: "Active",
          trialEndsAt: null,
          usage: [{ metric: "locations", current: 1 }],
        }),
      ),
      http.post("*/api/v2/billing/quotes", async ({ request }) => {
        const body = (await request.json()) as { targetPlanId: string };
        quoted = body.targetPlanId;
        return HttpResponse.json({
          quoteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          expiresAt: "2026-11-26T12:15:00Z",
          currency: "GHS",
          baseAmount: 499,
          taxAmount: 0,
          totalAmount: 499,
          prorationCredit: 0,
          effectiveAt: "2026-11-26T12:00:00Z",
          nextRenewalAt: "2026-12-26T12:00:00Z",
          nextRenewalTotal: 499,
          exceededLimits: [],
          requiresAcknowledgement: false,
        });
      }),
    );
    renderBilling(<PlanComparison />);
    expect(
      await screen.findByRole("button", { name: /choose professional/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/period ends/i)).toHaveTextContent(/Aug 2026.*UTC/);
    expect(screen.queryByText(/2026-08-15T00:00:00Z/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /choose professional/i }));
    await vi.waitFor(() => {
      expect(quoted).toBe("plan-professional");
    });
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
  });

  it("shows a quote error instead of a parsing error", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v2/billing/plans", () =>
        HttpResponse.json([billingPlansFixture[0], billingPlansFixture[1]]),
      ),
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({ ...subscriptionBody, plan: "Free", status: "Active" }),
      ),
      http.post("*/api/v2/billing/quotes", () =>
        HttpResponse.json(
          {
            title: "Price changed",
            detail: "The plan price changed; request a new quote.",
            status: 409,
          },
          { status: 409 },
        ),
      ),
    );
    renderBilling(<PlanComparison />);
    await user.click(await screen.findByRole("button", { name: /choose standard/i }));
    expect(await screen.findByText(/the plan price changed/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/invalid input: expected string/i),
    ).not.toBeInTheDocument();
  });

  it("upgrades and downgrades plans via change form", async () => {
    const user = userEvent.setup();
    let upgraded: string | undefined;
    let downgraded: string | undefined;
    server.use(
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Starter",
          status: "Active",
          trialEndsAt: null,
        }),
      ),
      http.post("*/api/v2/billing/subscription/upgrade", async ({ request }) => {
        const body = (await request.json()) as { planDefinitionId: string };
        upgraded = body.planDefinitionId;
        return HttpResponse.json({
          ...subscriptionBody,
          plan: body.planDefinitionId,
          status: "Active",
        });
      }),
      http.post("*/api/v2/billing/subscription/downgrade", async ({ request }) => {
        const body = (await request.json()) as { planDefinitionId: string };
        downgraded = body.planDefinitionId;
        return HttpResponse.json({
          ...subscriptionBody,
          plan: body.planDefinitionId,
          status: "Active",
        });
      }),
    );
    renderBilling(<ChangePlanForm />);
    await user.type(screen.getByLabelText(/target plan id/i), "pro");
    await user.click(screen.getByRole("button", { name: /upgrade now/i }));
    await user.click(screen.getByRole("button", { name: /downgrade at period end/i }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Downgrade plan",
      }),
    );
    await vi.waitFor(() => {
      expect(upgraded).toBe("pro");
      expect(downgraded).toBe("pro");
    });
  });

  it("cancels and reactivates with retention purge messaging", async () => {
    const user = userEvent.setup();
    let cancelled = false;
    let reactivated = false;
    server.use(
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          status: "Active",
          trialEndsAt: null,
          purgeAt: "2026-09-15T00:00:00Z",
        }),
      ),
      http.post("*/api/v2/billing/cancellation", () => {
        cancelled = true;
        return HttpResponse.json({
          ...subscriptionBody,
          status: "CancelAtPeriodEnd",
          purgeAt: "2026-09-15T00:00:00Z",
        });
      }),
      http.post("*/api/v2/billing/subscription/reactivate", () => {
        reactivated = true;
        return HttpResponse.json({
          ...subscriptionBody,
          status: "Active",
          purgeAt: null,
        });
      }),
    );
    renderBilling(<CancellationPanel />);
    expect(await screen.findByText(/retention purge at/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /cancel subscription/i }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancel subscription",
      }),
    );
    await user.click(screen.getByRole("button", { name: /reactivate/i }));
    await vi.waitFor(() => {
      expect(cancelled).toBe(true);
      expect(reactivated).toBe(true);
    });
  });

  it("keeps paid actions available during server-reported grace and explains the deadline", async () => {
    server.use(
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          status: "PastDue",
          trialEndsAt: null,
          graceExpiresAt: "2026-08-22T00:00:00Z",
          canPerformPaidMutations: true,
          retryStatus: "retrying",
        }),
      ),
    );
    function GateProbe() {
      const gate = useSubscriptionGate();
      return (
        <div role="status">
          {gate.status} {gate.readOnly ? "locked" : "remain available during grace"}
        </div>
      );
    }
    renderBilling(
      <SubscriptionGateProvider>
        <GateProbe />
      </SubscriptionGateProvider>,
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      /remain available during grace/i,
    );
    expect(screen.getByRole("status")).not.toHaveTextContent(/locked/i);
  });

  it("offers owner recovery for a locked subscription without hiding export controls", async () => {
    const user = userEvent.setup();
    let recoveryStarted = false;
    server.use(
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          status: "ReadOnly",
          trialEndsAt: null,
          canPerformPaidMutations: false,
          outstandingAmount: 249,
        }),
      ),
      http.post("*/api/v2/billing/recovery", () => {
        recoveryStarted = true;
        return HttpResponse.json(
          {
            intentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            status: "pending",
            authorizationUrl: null,
            approvalMessage: null,
            pollAfterSeconds: 5,
          },
          { status: 202 },
        );
      }),
    );
    renderBilling(
      <>
        <RecoveryPanel />
        <DataExportPanel />
      </>,
    );
    expect(await screen.findByText(/paid actions are locked/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start export/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /recover with saved card/i }));
    await vi.waitFor(() => {
      expect(recoveryStarted).toBe(true);
    });
  });

  it("renders four API plans and withholds switch actions on contact-sales", async () => {
    server.use(
      http.get("*/api/v2/billing/plans", () => HttpResponse.json(billingPlansFixture)),
      http.get("*/api/v2/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Standard",
          status: "Active",
          trialEndsAt: null,
        }),
      ),
    );
    renderBilling(<PlanComparison />);
    expect(await screen.findByLabelText(/plan free/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plan standard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plan professional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plan business/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /switch to professional/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /switch to business/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contact sales to change/i }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByText("Standard")
        .some((node) => node.classList.contains("text-primary")),
    ).toBe(true);
    expect(
      screen
        .getAllByText("Free")
        .some((node) => node.classList.contains("text-primary")),
    ).toBe(false);
  });
});
