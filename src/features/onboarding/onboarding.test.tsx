import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithRouter } from "../../shared/test/render-router";
import { OnboardingChecklist } from "./onboarding-checklist";
import { TrialSummary } from "./trial-summary";
import { SampleDataActions } from "./sample-data-actions";
import { tenantProfile } from "../../../tests/fixtures/provider/us1";
import {
  resetOpenShiftHintsForTests,
  setOpenShiftHint,
} from "../registers/shifts/open-shift-resume-store";

const subscription = {
  id: "12121212-1212-4212-8212-121212121212",
  plan: "Professional",
  status: "Trialing",
  billingCycle: "Monthly",
  currentPeriodStart: "2026-08-01T00:00:00.000Z",
  currentPeriodEnd: "2026-09-01T00:00:00.000Z",
  trialEndsAt: "2026-08-27T00:00:00.000Z",
  graceExpiresAt: null,
  cancelledAt: null,
  purgeAt: null,
  usage: [
    { metric: "products", used: 1, limit: 500 },
    { metric: "locations", used: 1, limit: 3 },
  ],
};

function tenantHandler(overrides: Record<string, unknown> = {}) {
  return http.get("*/api/v1/tenant", () =>
    HttpResponse.json({ ...tenantProfile, ...overrides }),
  );
}

describe("onboarding checklist", () => {
  beforeEach(() => {
    resetOpenShiftHintsForTests();
  });

  it("announces loading before the tenant profile resolves", () => {
    server.use(tenantHandler());
    renderWithRouter(<OnboardingChecklist />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
  });

  it("restores completed and remaining steps from the saved checklist", async () => {
    server.use(
      tenantHandler({
        onboardingChecklist: JSON.stringify({
          businessProfile: true,
          location: true,
          product: false,
        }),
      }),
    );

    renderWithRouter(<OnboardingChecklist />);

    const location = await screen.findByRole("listitem", { name: /first location/i });
    const locationBox = within(location).getByRole("checkbox");
    expect(locationBox).toBeChecked();
    expect(locationBox).toBeDisabled();

    const product = screen.getByRole("listitem", { name: /first product/i });
    expect(within(product).getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("does not let the owner toggle checklist steps manually", async () => {
    const user = userEvent.setup();
    let patched = false;
    server.use(
      tenantHandler({ onboardingChecklist: JSON.stringify({ businessProfile: true }) }),
      http.patch("*/api/v1/tenant", () => {
        patched = true;
        return HttpResponse.json(tenantProfile);
      }),
    );

    renderWithRouter(<OnboardingChecklist />);

    const location = await screen.findByRole("listitem", { name: /first location/i });
    const checkbox = within(location).getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(patched).toBe(false);
  });

  it("shows resume links for open shifts on the first-sale step", async () => {
    setOpenShiftHint({
      tenantId: "22222222-2222-4222-8222-222222222222",
      registerId: "88888888-8888-4888-8888-888888888888",
      registerName: "Front till",
      shiftId: "99999999-9999-4999-8999-999999999999",
    });
    server.use(tenantHandler());

    renderWithRouter(<OnboardingChecklist />);

    expect(
      await screen.findByRole("link", { name: /resume shift on front till/i }),
    ).toHaveAttribute("href", "/pos");
  });

  it("shows a recoverable failure without losing the checklist", async () => {
    server.use(
      http.get("*/api/v1/tenant", () =>
        HttpResponse.json(
          { title: "Service unavailable", status: 503, traceId: "trace-503" },
          { status: 503, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithRouter(<OnboardingChecklist />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/service unavailable/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeEnabled();
  });
});

describe("trial summary", () => {
  it("shows the trial status, deadline, and usage against plan limits", async () => {
    server.use(
      http.get("*/api/v1/billing/subscription", () => HttpResponse.json(subscription)),
    );

    renderWithRouter(<TrialSummary />);

    expect(await screen.findByText(/professional/i)).toBeInTheDocument();
    expect(screen.getByText(/trialing/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 500/)).toBeInTheDocument();
  });

  it("keeps the page usable when billing data is forbidden for this role", async () => {
    server.use(
      http.get("*/api/v1/billing/subscription", () =>
        HttpResponse.json(
          { title: "Forbidden", status: 403 },
          { status: 403, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithRouter(<TrialSummary />);

    expect(
      await screen.findByText(/subscription details are not available/i),
    ).toHaveAttribute("role", "status");
  });
});

describe("sample data actions", () => {
  it("requires explicit confirmation before removing sample records", async () => {
    const user = userEvent.setup();
    let removed = false;
    server.use(
      tenantHandler({ sampleDataLoaded: true }),
      http.delete("*/api/v1/tenant/sample-data", () => {
        removed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithRouter(<SampleDataActions />);

    await user.click(
      await screen.findByRole("button", { name: /remove sample data/i }),
    );
    expect(removed).toBe(false);
    expect(
      screen.getByText(/sample records are deleted and real records are kept/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /yes, remove sample data/i }));
    await waitFor(() => {
      expect(removed).toBe(true);
    });
  });

  it("loads sample data when none exists", async () => {
    const user = userEvent.setup();
    let loaded = false;
    server.use(
      tenantHandler({ sampleDataLoaded: false }),
      http.post("*/api/v1/tenant/sample-data", () => {
        loaded = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithRouter(<SampleDataActions />);

    await user.click(await screen.findByRole("button", { name: /load sample data/i }));

    await waitFor(() => {
      expect(loaded).toBe(true);
    });
  });
});
