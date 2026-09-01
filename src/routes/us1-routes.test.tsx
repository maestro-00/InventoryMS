import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AppProviders } from "../app/providers/app-providers";
import { sessionManager } from "../shared/auth/session-manager";
import { server } from "../shared/test/msw/server";
import { us1ScenarioHandlers, resetUs1Scenario } from "../shared/test/msw/us1-scenario";
import { ownerSessionRecord } from "../shared/test/render";

function signIn() {
  sessionManager.setSession(ownerSessionRecord);
}

function open(path: string) {
  window.history.replaceState({}, "", path);
  return render(<AppProviders />);
}

afterEach(() => {
  sessionManager.signOut();
  resetUs1Scenario();
});

describe("US1 routes", () => {
  it("mounts every first-sale destination behind the authenticated shell", async () => {
    server.use(...us1ScenarioHandlers);
    signIn();

    const routes: [path: string, heading: RegExp][] = [
      ["/onboarding", /set up your business/i],
      ["/locations", /^locations$/i],
      ["/catalogue/products", /^products$/i],
      ["/catalogue/categories", /product categories/i],
      ["/catalogue/import", /import products/i],
      ["/inventory/opening-stock", /opening stock/i],
      ["/settings/business", /business settings/i],
      ["/settings/receipts", /receipt template/i],
      ["/pos", /^sell$/i],
    ];

    for (const [path, heading] of routes) {
      const view = open(path);
      expect(
        await screen.findByRole("heading", { name: heading, level: 1 }),
        `heading for ${path}`,
      ).toBeInTheDocument();
      view.unmount();
    }
  });

  it("opens and closes the product form from the catalogue route", async () => {
    server.use(...us1ScenarioHandlers);
    signIn();
    const user = userEvent.setup();

    open("/catalogue/products");

    await user.click(await screen.findByRole("button", { name: /add a product/i }));
    expect(await screen.findByLabelText(/product name/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /close the product form/i }));
    expect(screen.queryByLabelText(/product name/i)).not.toBeInTheDocument();
  });

  it("selects a saved location on the locations route", async () => {
    server.use(...us1ScenarioHandlers);
    signIn();
    const user = userEvent.setup();

    open("/locations");

    await user.type(await screen.findByLabelText(/location name/i), "Main Shop");
    await user.click(screen.getByRole("button", { name: /save location/i }));

    expect(
      await screen.findByRole("button", { name: /select main shop/i }),
    ).toBeInTheDocument();
  });

  it("tells the cashier to create a location before the till can be used", async () => {
    server.use(...us1ScenarioHandlers);
    signIn();

    open("/pos");

    expect(await screen.findByText(/before you can sell/i)).toBeInTheDocument();
  });

  it("signs in from the login route and lands on the dashboard", async () => {
    server.use(...us1ScenarioHandlers);
    const user = userEvent.setup();

    open("/login");

    await user.type(await screen.findByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
  });

  it("registers a business from the register route and opens onboarding", async () => {
    server.use(...us1ScenarioHandlers);
    const user = userEvent.setup();

    open("/register");

    await user.type(await screen.findByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "correct-horse-battery");
    await user.type(screen.getByLabelText(/business name/i), "Kwame Provisions");
    await user.click(screen.getByRole("button", { name: /create business/i }));

    expect(
      await screen.findByRole("heading", { name: /set up your business/i }),
    ).toBeInTheDocument();
  });

  it("finishes a Google sign-in from the callback route", async () => {
    server.use(...us1ScenarioHandlers);
    const claims = {
      sub: ownerSessionRecord.userId,
      tenantId: ownerSessionRecord.tenantId,
      role: "Owner",
      permissions: ownerSessionRecord.permissions,
      locationScope: ownerSessionRecord.locationScope,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;

    open(
      `/auth/google-callback?accessToken=${encodeURIComponent(token)}&refreshToken=refresh`,
    );

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
  });

  it("strips OAuth tokens from the URL after Google sign-in", async () => {
    server.use(...us1ScenarioHandlers);
    const claims = {
      sub: ownerSessionRecord.userId,
      tenantId: ownerSessionRecord.tenantId,
      role: "Owner",
      permissions: ownerSessionRecord.permissions,
      locationScope: ownerSessionRecord.locationScope,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;

    open(
      `/auth/google-callback?accessToken=${encodeURIComponent(token)}&refreshToken=refresh&accessTokenExpiresAt=2026-08-13T12:00:00.000Z&redirect=%2Fdashboard`,
    );

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
    expect(window.location.search).not.toContain("accessToken");
    expect(window.location.search).not.toContain("refreshToken");
    expect(window.location.search).not.toContain("accessTokenExpiresAt");
  });
});
