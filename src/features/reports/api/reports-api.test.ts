import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import {
  fetchDashboard,
  fetchReport,
  fetchReportSchedules,
  startReportExport,
  pollExportJob,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  createReportSchedule,
  deactivateReportSchedule,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type ReportFilter,
} from "./reports-api";

const filter: ReportFilter = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-08-08T00:00:00.000Z",
  locationId: "55555555-5555-4555-8555-555555555555",
  categoryId: "66666666-6666-4666-8666-666666666666",
  staffId: "staff-1",
};

describe("reports api", () => {
  it("loads dashboard and each report kind with filters", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/dashboard", () =>
        HttpResponse.json({
          sales: {
            today: "10",
            sameDayLastWeek: "8",
            detailUrl: "/reports?kind=sales",
          },
          transactionCount: { today: 2, sameDayLastWeek: 1, detailUrl: "/reports" },
          averageBasket: { today: "5", sameDayLastWeek: "4", detailUrl: "/reports" },
          itemsSold: { today: "3", sameDayLastWeek: "2", detailUrl: "/reports" },
          cashInDrawer: { today: "20", sameDayLastWeek: "15", detailUrl: "/reports" },
          lowStockWarnings: 1,
          expiryWarnings: 0,
          topSellers: [],
        }),
      ),
      http.get("*/api/v1/reports/sales", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("locationId")).toBe(filter.locationId);
        expect(url.searchParams.get("categoryId")).toBe(filter.categoryId);
        expect(url.searchParams.get("staffId")).toBe("staff-1");
        return HttpResponse.json({ totalSales: "40", transactions: 2, rows: [] });
      }),
      http.get("*/api/v1/reports/profit", () =>
        HttpResponse.json({ grossProfit: "20", rows: [] }),
      ),
      http.get("*/api/v1/reports/stock", () =>
        HttpResponse.json({ totalValue: "100", rows: [] }),
      ),
      http.get("*/api/v1/reports/purchasing", () => HttpResponse.json({ rows: [] })),
      http.get("*/api/v1/reports/staff", () => HttpResponse.json({ rows: [] })),
      http.get("*/api/v1/reports/tax", () =>
        HttpResponse.json({
          from: filter.from,
          to: filter.to,
          totalTax: "5",
          components: [],
        }),
      ),
      http.get("*/api/v1/reports/schedules", () =>
        HttpResponse.json([
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            reportType: "sales",
            cadence: "Daily",
            format: "csv",
            recipients: ["owner@kwame.gh"],
            nextRunAt: "2026-08-14T00:00:00Z",
            isActive: true,
          },
        ]),
      ),
      http.get("*/api/v1/reports/sales/export", () =>
        HttpResponse.json(
          { jobId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", status: "Pending" },
          { status: 202 },
        ),
      ),
      http.get("*/api/v1/reports/export-jobs/ready", () =>
        HttpResponse.json({ status: "Ready" }),
      ),
      http.get(
        "*/api/v1/reports/export-jobs/fail",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(
        "*/api/v1/reports/export-jobs/:jobId",
        () => new HttpResponse(null, { status: 202 }),
      ),
      http.get("*/api/v1/notifications", () =>
        HttpResponse.json([
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            type: "LowStock",
            channel: "InApp",
            title: "Low",
            occurrences: 1,
            isRead: false,
            lastRaisedAt: "2026-08-13T00:00:00Z",
          },
        ]),
      ),
      http.post("*/api/v1/notifications/read-all", () =>
        HttpResponse.json({ count: 2 }),
      ),
      http.post("*/api/v1/notifications/:id/read", () => HttpResponse.json(true)),
      http.post("*/api/v1/reports/schedules", () =>
        HttpResponse.json(
          {
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            reportType: "sales",
            cadence: "Daily",
            format: "csv",
            recipients: ["owner@kwame.gh"],
            nextRunAt: "2026-08-14T00:00:00Z",
            isActive: true,
          },
          { status: 201 },
        ),
      ),
      http.delete("*/api/v1/reports/schedules/:id", () => HttpResponse.json(true)),
      http.get("*/api/v1/notification-preferences", () =>
        HttpResponse.json([
          { type: "LowStock", channel: "InApp", isEnabled: true, threshold: 5 },
        ]),
      ),
      http.put("*/api/v1/notification-preferences", async ({ request }) => {
        const body = (await request.json()) as {
          preferences: Array<{
            type: string;
            channel: string;
            isEnabled: boolean;
            threshold?: number | null;
          }>;
        };
        return HttpResponse.json(body.preferences);
      }),
      http.get("*/api/v1/reports/profit/export", () =>
        HttpResponse.json({ ok: true }, { status: 200 }),
      ),
    );

    await expect(fetchDashboard("2026-08-13T00:00:00.000Z")).resolves.toMatchObject({
      lowStockWarnings: 1,
    });
    await expect(fetchReport("sales", filter)).resolves.toMatchObject({
      totalSales: "40",
    });
    await expect(fetchReport("profit", filter)).resolves.toMatchObject({
      grossProfit: "20",
    });
    await expect(fetchReport("stock", filter)).resolves.toMatchObject({
      totalValue: "100",
    });
    await expect(fetchReport("purchasing", filter)).resolves.toMatchObject({
      rows: [],
    });
    await expect(fetchReport("staff", filter)).resolves.toMatchObject({ rows: [] });
    await expect(fetchReport("tax", filter)).resolves.toMatchObject({ totalTax: "5" });
    await expect(fetchReportSchedules()).resolves.toMatchObject({ totalCount: 1 });
    await expect(startReportExport("sales", "csv", filter)).resolves.toMatchObject({
      status: "Pending",
    });
    await expect(startReportExport("profit", "pdf", filter)).resolves.toMatchObject({
      status: "Ready",
    });
    await expect(
      pollExportJob("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ).resolves.toEqual({
      status: "Pending",
    });
    await expect(pollExportJob("fail")).resolves.toEqual({ status: "Failed" });
    await expect(pollExportJob("ready")).resolves.toMatchObject({ status: "Ready" });
    await expect(fetchNotifications()).resolves.toMatchObject({ totalCount: 1 });
    await expect(markAllNotificationsRead()).resolves.toBe(2);
    await expect(
      markNotificationRead("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
    ).resolves.toBeUndefined();
    await expect(
      createReportSchedule({
        reportType: "sales",
        cadence: "Daily",
        format: "csv",
        recipients: ["owner@kwame.gh"],
      }),
    ).resolves.toMatchObject({ isActive: true });
    await expect(
      deactivateReportSchedule("dddddddd-dddd-4ddd-8ddd-dddddddddddd"),
    ).resolves.toBeUndefined();
    await expect(fetchNotificationPreferences()).resolves.toHaveLength(1);
    await expect(
      updateNotificationPreferences([
        { type: "LowStock", channel: "Push", isEnabled: true },
      ]),
    ).resolves.toBeDefined();
  });
});
