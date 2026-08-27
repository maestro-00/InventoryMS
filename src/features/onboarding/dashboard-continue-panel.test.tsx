import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { heldSale } from "../../../tests/fixtures/provider/us2";
import {
  locationRecord,
  registerRecord,
  shiftRecord,
  tenantProfile,
} from "../../../tests/fixtures/provider/us1";
import { server } from "../../shared/test/msw/server";
import { renderWithRouter } from "../../shared/test/render-router";
import { DashboardContinuePanel } from "./dashboard-continue-panel";

describe("DashboardContinuePanel", () => {
  beforeEach(() => {
    server.use(
      http.get("*/api/v1/locations", () => HttpResponse.json([locationRecord])),
      http.get("*/api/v1/shifts", () => HttpResponse.json([])),
      http.get("*/api/v1/registers", () => HttpResponse.json([registerRecord])),
    );
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

  it("lists held sales and open-shift resume links from InventoryX", async () => {
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
      http.get("*/api/v1/shifts", ({ request }) => {
        const status = new URL(request.url).searchParams.get("status");
        expect(status).toBe("Open");
        return HttpResponse.json([shiftRecord]);
      }),
      http.get("*/api/v1/registers", () => HttpResponse.json([registerRecord])),
    );

    renderWithRouter(<DashboardContinuePanel />);

    expect(
      await screen.findByRole("link", { name: /resume shift on counter 1/i }),
    ).toHaveAttribute("href", "/pos");
    expect(
      await screen.findByRole("link", { name: /resume held sale/i }),
    ).toHaveAttribute("href", "/pos");
    expect(
      screen.queryByRole("link", { name: /get started|resume setup/i }),
    ).toBeNull();
  });
});
