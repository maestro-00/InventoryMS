import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithRouter } from "../../shared/test/render-router";
import { DashboardPanel } from "./dashboard/dashboard-metrics";
import { StandardReportTable } from "./standard-reports/report-table";
import { ReportExportPanel } from "./exports/export-panel";
import { ReportSchedulesPanel } from "./schedules/schedules-panel";
import type { DashboardRecord } from "./api/reports-api";

const dashboard: DashboardRecord = {
  sales: { today: "120", sameDayLastWeek: "90", detailUrl: "/api/v1/reports/sales" },
  transactionCount: {
    today: 4,
    sameDayLastWeek: 3,
    detailUrl: "/api/v1/reports/sales",
  },
  averageBasket: {
    today: "30",
    sameDayLastWeek: "28",
    detailUrl: "/api/v1/reports/sales",
  },
  itemsSold: { today: "12", sameDayLastWeek: "10", detailUrl: "/api/v1/reports/sales" },
  cashInDrawer: {
    today: "80",
    sameDayLastWeek: "70",
    detailUrl: "/api/v1/reports/staff",
  },
  lowStockWarnings: 1,
  expiryWarnings: 0,
  topSellers: [
    {
      productId: "44444444-4444-4444-8444-444444444444",
      productName: "Sugar 1kg",
      quantity: "8",
      sales: "80",
      detailUrl: "/api/v1/reports/sales",
    },
  ],
  grossProfit: "40",
};

describe("reporting dashboard and tables", () => {
  it("renders comparison metrics, warnings, and profit when allowed", () => {
    renderWithRouter(
      <DashboardPanel
        data={dashboard}
        canViewProfit
        canSell
        canManageStock
        canViewReports
      />,
    );
    expect(screen.getByText(/sales today/i)).toBeInTheDocument();
    expect(screen.getByText(/items sold/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /low stock warnings/i })).toHaveTextContent(
      "1",
    );
    expect(screen.getByText(/gross profit/i)).toBeInTheDocument();
    expect(screen.getByText(/sugar 1kg/i)).toBeInTheDocument();
  });

  it("hides profit columns without ViewProfit", () => {
    renderWithRouter(
      <StandardReportTable
        kind="profit"
        canViewProfit={false}
        data={{ grossProfit: "40", rows: [] }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/viewprofit/i);
  });

  it("renders ghana tax components", () => {
    renderWithRouter(
      <StandardReportTable
        kind="tax"
        canViewProfit
        data={{
          totalTax: "20",
          components: [
            { code: "GH-STD", name: "Standard VAT", rate: "0.15", amount: "20" },
          ],
        }}
      />,
    );
    expect(screen.getByText(/gh-std/i)).toBeInTheDocument();
    expect(screen.getByText(/total tax/i)).toBeInTheDocument();
  });
});

describe("exports and schedules", () => {
  it("polls an export job until ready", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get("*/api/v1/reports/:reportType/export", () =>
        HttpResponse.json(
          { jobId: "c1111111-1111-4111-8111-111111111111", status: "Pending" },
          { status: 202 },
        ),
      ),
      http.get("*/api/v1/reports/export-jobs/:id", () => {
        attempts += 1;
        if (attempts < 2) {
          return HttpResponse.json({ status: "Pending" }, { status: 202 });
        }
        return new HttpResponse("ok", { status: 200 });
      }),
    );
    renderWithRouter(
      <ReportExportPanel
        kind="sales"
        filter={{ from: "2026-08-01T00:00:00.000Z", to: "2026-08-13T00:00:00.000Z" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /start export/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/ready/i);
    });
  });

  it("creates and deactivates a report schedule", async () => {
    const user = userEvent.setup();
    const schedules: Array<Record<string, unknown>> = [];
    server.use(
      http.get("*/api/v1/reports/schedules", () =>
        HttpResponse.json({ items: schedules, totalCount: schedules.length }),
      ),
      http.post("*/api/v1/reports/schedules", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const schedule = {
          id: "d1111111-1111-4111-8111-111111111111",
          ...body,
          nextRunAt: new Date().toISOString(),
          isActive: true,
        };
        schedules.push(schedule);
        return HttpResponse.json(schedule, { status: 201 });
      }),
      http.delete("*/api/v1/reports/schedules/:id", () => {
        const schedule = schedules[0];
        if (schedule) schedule.isActive = false;
        return HttpResponse.json(true);
      }),
    );
    renderWithRouter(<ReportSchedulesPanel />);
    await user.click(screen.getByRole("button", { name: /create schedule/i }));
    expect(
      await screen.findByText(/sales · daily · csv · active/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /deactivate/i }));
    await waitFor(() => {
      expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    });
  });
});
