import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { heldSale } from "../../../tests/fixtures/provider/us2";
import { tenantProfile } from "../../../tests/fixtures/provider/us1";
import { server } from "../../shared/test/msw/server";
import { renderWithRouter } from "../../shared/test/render-router";
import {
  resetOpenShiftHintsForTests,
  setOpenShiftHint,
} from "../registers/shifts/open-shift-resume-store";
import { DashboardContinuePanel } from "./dashboard-continue-panel";

describe("DashboardContinuePanel", () => {
  beforeEach(() => {
    resetOpenShiftHintsForTests();
  });

  it("shows Get started when no checklist steps are done", async () => {
    server.use(
      http.get("*/api/v1/tenant", () =>
        HttpResponse.json({
          ...tenantProfile,
          onboardingChecklist: JSON.stringify({}),
        }),
      ),
      http.get("*/api/v1/sales/held", () => HttpResponse.json([])),
    );

    renderWithRouter(<DashboardContinuePanel />);

    expect(await screen.findByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/onboarding",
    );
  });

  it("shows Resume setup when onboarding is partially complete", async () => {
    server.use(
      http.get("*/api/v1/tenant", () =>
        HttpResponse.json({
          ...tenantProfile,
          onboardingChecklist: JSON.stringify({ location: true }),
        }),
      ),
      http.get("*/api/v1/sales/held", () => HttpResponse.json([])),
    );

    renderWithRouter(<DashboardContinuePanel />);

    expect(
      await screen.findByRole("link", { name: /resume setup/i }),
    ).toBeInTheDocument();
  });

  it("lists held sales and open-shift resume links", async () => {
    setOpenShiftHint({
      tenantId: "22222222-2222-4222-8222-222222222222",
      registerId: "88888888-8888-4888-8888-888888888888",
      registerName: "Front till",
      shiftId: "99999999-9999-4999-8999-999999999999",
    });
    server.use(
      http.get("*/api/v1/tenant", () =>
        HttpResponse.json({
          ...tenantProfile,
          onboardingChecklist: JSON.stringify({
            businessProfile: true,
            location: true,
            product: true,
            openingStock: true,
            register: true,
            firstSale: true,
          }),
        }),
      ),
      http.get("*/api/v1/sales/held", () => HttpResponse.json([heldSale])),
    );

    renderWithRouter(<DashboardContinuePanel />);

    expect(
      await screen.findByRole("link", { name: /resume shift on front till/i }),
    ).toHaveAttribute("href", "/pos");
    expect(
      await screen.findByRole("link", { name: /resume held sale/i }),
    ).toHaveAttribute("href", "/pos");
    expect(
      screen.queryByRole("link", { name: /get started|resume setup/i }),
    ).toBeNull();
  });
});
