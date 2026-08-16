import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../shared/test/msw/server";
import { PlanComparison } from "./plans/plan-comparison";
import { CancellationPanel } from "./subscription/cancellation";
import { ChangePlanForm } from "./subscription/change-plan";
import { PaymentMethodForm } from "./payment-method/payment-method-form";
import { DataExportPanel, InvoiceHistory } from "./invoices/invoice-history";
import { ownerSession } from "../../../tests/fixtures/provider/session";
import { SessionProvider } from "../../shared/auth/session-context";
import { SessionManager, sessionManager } from "../../shared/auth/session-manager";

const subscriptionBody = {
  id: "11111111-1111-4111-8111-111111111111",
  plan: "Professional",
  status: "Trialing",
  billingCycle: "Monthly",
  currentPeriodStart: "2026-08-01T00:00:00Z",
  currentPeriodEnd: "2026-08-15T00:00:00Z",
  trialEndsAt: "2026-08-15T00:00:00Z",
  usage: [{ metric: "SalesThisMonth", used: 2, limit: 500 }],
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
    expect(screen.getByText(/SalesThisMonth: 2 \/ 500/)).toBeInTheDocument();
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
    await user.selectOptions(screen.getByLabelText(/^channel$/i), "Card");
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
    server.use(
      http.get("*/api/v1/billing/invoices", () =>
        HttpResponse.json([
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            number: "INV-1",
            status: "Paid",
            total: "120.00",
            issuedAt: "2026-08-01T00:00:00Z",
          },
        ]),
      ),
      http.post("*/api/v1/tenant/export", () =>
        HttpResponse.json({ jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
      ),
      http.get("*/api/v1/tenant/export/:jobId", () =>
        HttpResponse.json({
          status: "Completed",
          downloadUrl: "https://example.test/export.zip",
        }),
      ),
    );
    renderBilling(
      <>
        <InvoiceHistory />
        <DataExportPanel />
      </>,
    );
    expect(await screen.findByText(/INV-1 · Paid · 120.00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /start export/i }));
    expect(await screen.findByText(/Status: Completed/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /download export/i })).toHaveAttribute(
      "href",
      "https://example.test/export.zip",
    );
  });

  it("upgrades from plan cards and handles usage without limits", async () => {
    const user = userEvent.setup();
    let upgraded: string | undefined;
    server.use(
      http.get("*/api/v1/billing/plans", () =>
        HttpResponse.json([
          { id: "starter", name: "Starter", tier: "Starter" },
          { id: "pro", name: "Professional", tier: "Professional" },
        ]),
      ),
      http.get("*/api/v1/billing/subscription", () =>
        HttpResponse.json({
          ...subscriptionBody,
          plan: "Starter",
          status: "Active",
          trialEndsAt: null,
          usage: [{ metric: "Locations", used: 1 }],
        }),
      ),
      http.post("*/api/v1/billing/subscription/upgrade", async ({ request }) => {
        const body = (await request.json()) as { planId: string };
        upgraded = body.planId;
        return HttpResponse.json({
          ...subscriptionBody,
          plan: "Professional",
          status: "Active",
        });
      }),
      http.post("*/api/v1/billing/subscription/downgrade", async ({ request }) => {
        const body = (await request.json()) as { planId: string };
        return HttpResponse.json({
          ...subscriptionBody,
          plan: body.planId,
          status: "Active",
        });
      }),
    );
    renderBilling(<PlanComparison />);
    expect(await screen.findByText(/Locations: 1$/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /upgrade to professional/i }));
    await vi.waitFor(() => {
      expect(upgraded).toBe("pro");
    });
  });

  it("upgrades and downgrades plans via change form", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
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
        const body = (await request.json()) as { planId: string };
        upgraded = body.planId;
        return HttpResponse.json({
          ...subscriptionBody,
          plan: body.planId,
          status: "Active",
        });
      }),
      http.post("*/api/v1/billing/subscription/downgrade", async ({ request }) => {
        const body = (await request.json()) as { planId: string };
        downgraded = body.planId;
        return HttpResponse.json({
          ...subscriptionBody,
          plan: body.planId,
          status: "Active",
        });
      }),
    );
    renderBilling(<ChangePlanForm />);
    await user.type(screen.getByLabelText(/target plan id/i), "pro");
    await user.click(screen.getByRole("button", { name: /upgrade now/i }));
    await user.click(screen.getByRole("button", { name: /downgrade at period end/i }));
    await vi.waitFor(() => {
      expect(upgraded).toBe("pro");
      expect(downgraded).toBe("pro");
    });
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("cancels and reactivates with retention purge messaging", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
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
    await user.click(screen.getByRole("button", { name: /reactivate/i }));
    await vi.waitFor(() => {
      expect(cancelled).toBe(true);
      expect(reactivated).toBe(true);
    });
    confirm.mockRestore();
  });
});
