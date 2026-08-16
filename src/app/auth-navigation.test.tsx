import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { SESSION_MARKER_COOKIE, SessionManager } from "../shared/auth/session-manager";
import { server } from "../shared/test/msw/server";
import { AppProviders } from "./providers/app-providers";
import { authSessionFixture } from "../../tests/fixtures/domain";

const OWNER_PERMISSIONS = [
  "Sell",
  "Refund",
  "Discount",
  "VoidSale",
  "ViewProfit",
  "ManageStock",
  "ManagePurchasing",
  "ManagePricing",
  "ManageUsers",
  "ViewReports",
  "ApproveAdjustments",
];

/** Mirrors the provider's access token so the client reads real claims. */
function ownerAccessToken(): string {
  const claims = {
    sub: authSessionFixture.userId,
    tenantId: authSessionFixture.tenantId,
    role: "Owner",
    permissions: OWNER_PERMISSIONS,
    locationScope: [...authSessionFixture.locationScope],
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
}

function ownerRecord() {
  return {
    ...authSessionFixture,
    role: "Owner",
    permissions: OWNER_PERMISSIONS,
    locationScope: [...authSessionFixture.locationScope],
    accessToken: ownerAccessToken(),
    refreshToken: "refresh-token",
  };
}

function signedInManager() {
  const manager = new SessionManager({ origin: "http://localhost:5088" });
  manager.setSession(ownerRecord());
  return manager;
}

function anonymousManager() {
  const manager = new SessionManager({ origin: "http://localhost:5088" });
  manager.markRestored();
  return manager;
}

function reportHandlers() {
  return [
    http.get("*/api/v1/dashboard", () =>
      HttpResponse.json({
        sales: { today: "10", sameDayLastWeek: "8", detailUrl: "/reports" },
        transactionCount: { today: 2, sameDayLastWeek: 1, detailUrl: "/reports" },
        averageBasket: { today: "5", sameDayLastWeek: "4", detailUrl: "/reports" },
        itemsSold: { today: "3", sameDayLastWeek: "2", detailUrl: "/reports" },
        cashInDrawer: { today: "20", sameDayLastWeek: "15", detailUrl: "/reports" },
        lowStockWarnings: 0,
        expiryWarnings: 0,
        topSellers: [],
        grossProfit: "4",
      }),
    ),
    http.get("*/api/v1/reports/sales", () =>
      HttpResponse.json({ totalSales: "10", transactions: 1, rows: [] }),
    ),
    http.get("*/api/v1/reports/schedules", () =>
      HttpResponse.json({ items: [], totalCount: 0 }),
    ),
    http.get("*/api/v1/locations", () => HttpResponse.json([])),
  ];
}

afterEach(() => {
  document.cookie = `${SESSION_MARKER_COOKIE}=; Max-Age=0; path=/`;
});

describe("authenticated navigation", () => {
  it("follows a dashboard metric link without dropping the session", async () => {
    const user = userEvent.setup();
    server.use(...reportHandlers());
    const manager = signedInManager();
    window.history.replaceState({}, "", "/dashboard");

    render(<AppProviders manager={manager} />);

    const link = await screen.findByRole("link", { name: /sales today/i });
    await user.click(link);

    expect(
      await screen.findByRole("heading", { name: /^reports$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
    expect(manager.getSnapshot()).not.toBeNull();
  });

  it("sends an already signed-in visitor from the sign-in page to the dashboard", async () => {
    server.use(...reportHandlers());
    const manager = signedInManager();
    window.history.replaceState({}, "", "/login");

    render(<AppProviders manager={manager} />);

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("lands on the dashboard after signing in instead of returning to sign-in", async () => {
    const user = userEvent.setup();
    server.use(
      ...reportHandlers(),
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json({
          requiresTwoFactor: false,
          accessToken: ownerAccessToken(),
          accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          refreshToken: "refresh-token",
        }),
      ),
    );
    const manager = anonymousManager();
    window.history.replaceState({}, "", "/login");

    render(<AppProviders manager={manager} />);

    await user.type(await screen.findByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
  });

  it("opens onboarding after registering a business", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/auth/register", () =>
        HttpResponse.json(
          {
            tenantId: authSessionFixture.tenantId,
            businessName: "Kwame Provisions",
            subscriptionStatus: "Trialing",
            accessToken: ownerAccessToken(),
            accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
            refreshToken: "refresh-token",
          },
          { status: 201 },
        ),
      ),
    );
    const manager = anonymousManager();
    window.history.replaceState({}, "", "/register");

    render(<AppProviders manager={manager} />);

    await user.type(await screen.findByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.type(screen.getByLabelText(/business name/i), "Kwame Provisions");
    await user.click(screen.getByRole("button", { name: /create business/i }));

    expect(
      await screen.findByRole("heading", { name: /set up your business/i }),
    ).toBeInTheDocument();
  });

  it("ignores an off-site redirect target after signing in", async () => {
    const user = userEvent.setup();
    server.use(
      ...reportHandlers(),
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json({
          requiresTwoFactor: false,
          accessToken: ownerAccessToken(),
          accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          refreshToken: "refresh-token",
        }),
      ),
    );
    const manager = anonymousManager();
    window.history.replaceState({}, "", "/login?redirect=https://evil.example/steal");

    render(<AppProviders manager={manager} />);

    const googleLink = await screen.findByRole("link", {
      name: /continue with google/i,
    });
    expect(googleLink.getAttribute("href")).not.toContain("evil.example");

    await user.type(screen.getByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
  });
});

describe("session restore on cold load", () => {
  it("restores a cookie-backed session instead of showing sign-in", async () => {
    server.use(
      ...reportHandlers(),
      http.post("*/api/v1/auth/refresh", () =>
        HttpResponse.json({
          accessToken: ownerAccessToken(),
          accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          refreshToken: "refresh-token",
        }),
      ),
    );
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;
    const manager = new SessionManager({ origin: "http://localhost:5088" });
    window.history.replaceState({}, "", "/dashboard");

    render(<AppProviders manager={manager} />);

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("shows sign-in when no session cookie is present", async () => {
    const manager = new SessionManager({ origin: "http://localhost:5088" });
    window.history.replaceState({}, "", "/dashboard");

    render(<AppProviders manager={manager} />);

    expect(
      await screen.findByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("keeps the visitor anonymous when the cookie is no longer accepted", async () => {
    server.use(
      http.post("*/api/v1/auth/refresh", () => new HttpResponse(null, { status: 401 })),
    );
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;
    const manager = new SessionManager({ origin: "http://localhost:5088" });
    window.history.replaceState({}, "", "/dashboard");

    render(<AppProviders manager={manager} />);

    expect(
      await screen.findByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(manager.getStatus()).toBe("anonymous");
    });
  });
});
