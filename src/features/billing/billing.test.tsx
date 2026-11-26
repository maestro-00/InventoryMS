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
import { DataExportPanel, InvoiceHistory } from "./invoices/invoice-history";
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
  it("shows plan comparison, trial, and cancellation controls", async () => {
    server.use(
      http.get("*/api/v1/billing/plans", () =>
        HttpResponse.json([{ id: "pro", name: "Professional", tier: "Professional" }]),
      ),
      http.get("*/api/v1/billing/subscription", () =>
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

  it("saves payment method and billing contact", async () => {
    const user = userEvent.setup();
    let savedPayment: unknown;
    let savedContact: unknown;
    server.use(
      http.post("*/api/v1/billing/payment-method", async ({ request }) => {
        savedPayment = await request.json();
        return HttpResponse.json({ ok: true });
      }),
      http.patch("*/api/v1/billing/contact", async ({ request }) => {
        savedContact = await request.json();
        return HttpResponse.json({ ok: true });
      }),
    );
    renderBilling(<PaymentMethodForm />);
    await selectRadixOption(user, screen.getByLabelText(/^channel$/i), "Card");
    await user.type(screen.getByLabelText(/payment reference/i), "ref-1");
    await user.type(screen.getByLabelText(/billing email/i), "billing@kwame.gh");
    await user.type(screen.getByLabelText(/tax number/i), "C0001112223");
    await user.click(screen.getByRole("button", { name: /save billing details/i }));
    await vi.waitFor(() => {
      expect(savedPayment).toEqual({ channel: "Card", reference: "ref-1" });
      expect(savedContact).toMatchObject({
        billingEmail: "billing@kwame.gh",
        taxNumber: "C0001112223",
      });
    });
  });

  it("lists invoices and starts a data export job", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    let downloads = 0;
    server.use(
      http.get("*/api/v1/billing/invoices", () =>
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
    await vi.waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(downloads).toBe(1);
  });

  it("upgrades from plan cards and handles usage without limits", async () => {
    const user = userEvent.setup();
    let upgraded: string | undefined;
    server.use(
      http.get("*/api/v1/billing/plans", () =>
        HttpResponse.json([billingPlansFixture[0], billingPlansFixture[2]]),
      ),
      http.get("*/api/v1/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Free",
          status: "Active",
          trialEndsAt: null,
          usage: [{ metric: "locations", current: 1 }],
        }),
      ),
      http.post("*/api/v1/billing/subscription/upgrade", async ({ request }) => {
        const body = (await request.json()) as { planDefinitionId: string };
        upgraded = body.planDefinitionId;
        return HttpResponse.json({
          ...subscriptionBody,
          plan: "Professional",
          status: "Active",
        });
      }),
      http.post("*/api/v1/billing/subscription/downgrade", async ({ request }) => {
        const body = (await request.json()) as { planDefinitionId: string };
        return HttpResponse.json({
          ...subscriptionBody,
          plan: body.planDefinitionId,
          status: "Active",
        });
      }),
    );
    renderBilling(<PlanComparison />);
    expect(
      await screen.findByRole("button", { name: /switch to professional/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/period ends/i)).toHaveTextContent(/Aug 2026.*UTC/);
    expect(screen.queryByText(/2026-08-15T00:00:00Z/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /switch to professional/i }));
    await vi.waitFor(() => {
      expect(upgraded).toBe("plan-professional");
    });
  });

  it("shows the billing prerequisite instead of subscription parsing errors", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v1/billing/plans", () =>
        HttpResponse.json([billingPlansFixture[0], billingPlansFixture[1]]),
      ),
      http.get("*/api/v1/billing/subscription", () =>
        HttpResponse.json({ ...subscriptionBody, plan: "Free", status: "Active" }),
      ),
      http.post("*/api/v1/billing/subscription/upgrade", () =>
        HttpResponse.json(
          {
            title: "Validation failed",
            detail: "Add a billing email and payment method before switching to a paid plan.",
            status: 400,
          },
          { status: 400 },
        ),
      ),
    );
    renderBilling(<PlanComparison />);
    await user.click(await screen.findByRole("button", { name: /switch to standard/i }));
    expect(await screen.findByText(/add a billing email and payment method/i)).toBeInTheDocument();
    expect(screen.queryByText(/invalid input: expected string/i)).not.toBeInTheDocument();
  });

  it("upgrades and downgrades plans via change form", async () => {
    const user = userEvent.setup();
    let upgraded: string | undefined;
    let downgraded: string | undefined;
    server.use(
      http.get("*/api/v1/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Starter",
          status: "Active",
          trialEndsAt: null,
        }),
      ),
      http.post("*/api/v1/billing/subscription/upgrade", async ({ request }) => {
        const body = (await request.json()) as { planDefinitionId: string };
        upgraded = body.planDefinitionId;
        return HttpResponse.json({
          ...subscriptionBody,
          plan: body.planDefinitionId,
          status: "Active",
        });
      }),
      http.post("*/api/v1/billing/subscription/downgrade", async ({ request }) => {
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
      http.get("*/api/v1/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          status: "Active",
          trialEndsAt: null,
          purgeAt: "2026-09-15T00:00:00Z",
        }),
      ),
      http.post("*/api/v1/billing/subscription/cancel", () => {
        cancelled = true;
        return HttpResponse.json({
          ...subscriptionBody,
          status: "CancelAtPeriodEnd",
          purgeAt: "2026-09-15T00:00:00Z",
        });
      }),
      http.post("*/api/v1/billing/subscription/reactivate", () => {
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

  it("renders four API plans and withholds switch actions on contact-sales", async () => {
    server.use(
      http.get("*/api/v1/billing/plans", () => HttpResponse.json(billingPlansFixture)),
      http.get("*/api/v1/billing/subscription", () =>
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
