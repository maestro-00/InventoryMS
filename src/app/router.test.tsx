import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import {
  authSessionFixture,
  permissionMatrixFixture,
} from "../../tests/fixtures/domain";
import { sessionManager } from "../shared/auth/session-manager";
import { server } from "../shared/test/msw/server";
import { AppProviders } from "./providers/app-providers";

afterEach(() => {
  sessionManager.signOut();
});

describe("app router", () => {
  it("renders public foundation routes", async () => {
    window.history.replaceState({}, "", "/login");
    const { unmount } = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
    unmount();

    window.history.replaceState({}, "", "/register");
    render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /create a business/i }),
    ).toBeInTheDocument();
  });

  it("redirects anonymous users away from the authenticated shell", async () => {
    window.history.replaceState({}, "", "/dashboard");
    render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("renders the authenticated shell and hides POS without Sell", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      role: "Manager",
      permissions: ["ViewReports"],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    window.history.replaceState({}, "", "/dashboard");
    render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: /point of sale/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows POS navigation when the cashier may sell", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...permissionMatrixFixture.Cashier],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    window.history.replaceState({}, "", "/dashboard");
    render(<AppProviders />);
    expect(
      await screen.findByRole("link", { name: /point of sale/i }),
    ).toBeInTheDocument();
  });

  it("renders remaining public placeholders and a not-found page", async () => {
    window.history.replaceState({}, "", "/");
    const home = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
    home.unmount();

    window.history.replaceState({}, "", "/plans");
    const first = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /^plans$/i }),
    ).toBeInTheDocument();
    first.unmount();

    window.history.replaceState({}, "", "/invite/accept");
    const second = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /accept invitation/i }),
    ).toBeInTheDocument();
    second.unmount();

    window.history.replaceState({}, "", "/missing-route");
    render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /page not found/i }),
    ).toBeInTheDocument();
  });

  it("opens reports with data and switches kind via filters", async () => {
    const user = userEvent.setup();
    sessionManager.setSession({
      ...authSessionFixture,
      role: "Owner",
      permissions: [
        "ViewReports",
        "ViewProfit",
        "ManagePurchasing",
        "Sell",
        "ManageStock",
      ],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    server.use(
      http.get("*/api/v1/locations", () =>
        HttpResponse.json([
          { id: "33333333-3333-4333-8333-333333333333", name: "Makola" },
        ]),
      ),
      http.get("*/api/v1/reports/sales", () =>
        HttpResponse.json({ totalSales: "10", transactions: 1, rows: [] }),
      ),
      http.get("*/api/v1/reports/tax", () =>
        HttpResponse.json({
          from: "2026-08-01T00:00:00.000Z",
          to: "2026-08-08T00:00:00.000Z",
          totalTax: "1",
          components: [],
        }),
      ),
      http.get("*/api/v1/reports/schedules", () =>
        HttpResponse.json({ items: [], totalCount: 0 }),
      ),
    );
    window.history.replaceState({}, "", "/reports");
    render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /^reports$/i }),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: /^report$/i }),
      "tax",
    );
    expect(await screen.findByText(/Ghana tax report/i)).toBeInTheDocument();
  });

  it("opens purchasing, batches, staff, and offline review for owners", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      role: "Owner",
      permissions: [
        "ViewReports",
        "ViewProfit",
        "ManagePurchasing",
        "Sell",
        "ManageStock",
        "ManageUsers",
      ],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    window.history.replaceState({}, "", "/purchasing");
    const purchasing = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /^purchasing$/i }),
    ).toBeInTheDocument();
    purchasing.unmount();

    window.history.replaceState({}, "", "/inventory/batches");
    const batches = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /^batches$/i }),
    ).toBeInTheDocument();
    batches.unmount();

    window.history.replaceState({}, "", "/staff");
    const staff = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /staff administration/i }),
    ).toBeInTheDocument();
    staff.unmount();

    window.history.replaceState({}, "", "/offline/review");
    render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /offline review/i }),
    ).toBeInTheDocument();
  });

  it("opens registers and applies report search filters", async () => {
    const user = userEvent.setup();
    sessionManager.setSession({
      ...authSessionFixture,
      role: "Owner",
      permissions: ["ViewReports", "ViewProfit", "Sell", "ManageStock"],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    server.use(
      http.get("*/api/v1/registers", () =>
        HttpResponse.json([
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Counter 1",
            locationId: "33333333-3333-4333-8333-333333333333",
            status: "Active",
          },
        ]),
      ),
      http.get("*/api/v1/locations", () =>
        HttpResponse.json([
          { id: "33333333-3333-4333-8333-333333333333", name: "Makola" },
        ]),
      ),
      http.get("*/api/v1/reports/profit", () =>
        HttpResponse.json({ grossProfit: "12", rows: [] }),
      ),
      http.get("*/api/v1/reports/schedules", () =>
        HttpResponse.json({ items: [], totalCount: 0 }),
      ),
    );

    window.history.replaceState({}, "", "/registers");
    const registers = render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /registers and shifts/i }),
    ).toBeInTheDocument();
    registers.unmount();

    window.history.replaceState(
      {},
      "",
      "/reports?kind=profit&locationId=33333333-3333-4333-8333-333333333333&from=2026-08-01T00:00:00.000Z&to=2026-08-08T00:00:00.000Z",
    );
    render(<AppProviders />);
    expect(
      await screen.findByRole("heading", { name: /^reports$/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/gross profit/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: /^location$/i }), "");
  });
});
