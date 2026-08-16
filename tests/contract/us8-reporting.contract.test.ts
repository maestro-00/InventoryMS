import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import {
  createReportSchedule,
  deactivateReportSchedule,
  fetchDashboard,
  fetchNotifications,
  fetchNotificationPreferences,
  fetchReport,
  markAllNotificationsRead,
  markNotificationRead,
  pollExportJob,
  startReportExport,
  updateNotificationPreferences,
} from "../../src/features/reports/api/reports-api";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US8_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/dashboard"],
  ["get", "/api/v1/reports/sales"],
  ["get", "/api/v1/reports/profit"],
  ["get", "/api/v1/reports/stock"],
  ["get", "/api/v1/reports/purchasing"],
  ["get", "/api/v1/reports/staff"],
  ["get", "/api/v1/reports/tax"],
  ["get", "/api/v1/reports/schedules"],
  ["post", "/api/v1/reports/schedules"],
  ["get", "/api/v1/reports/schedules/{id}"],
  ["delete", "/api/v1/reports/schedules/{id}"],
  ["get", "/api/v1/reports/{reportType}/export"],
  ["get", "/api/v1/reports/export-jobs/{id}"],
  ["get", "/api/v1/export/stock"],
  ["get", "/api/v1/notifications"],
  ["post", "/api/v1/notifications/{id}/read"],
  ["post", "/api/v1/notifications/read-all"],
  ["get", "/api/v1/notification-preferences"],
  ["put", "/api/v1/notification-preferences"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

const FILTER = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-08-13T23:59:59.000Z",
};

describe("US8 provider contract surface", () => {
  it("captures dashboard/report/export/notification operations", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US8_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });
});

describe("reporting API contracts", () => {
  it("loads dashboard, sales, and profit reports", async () => {
    server.use(
      http.get("*/api/v1/dashboard", () =>
        HttpResponse.json({
          sales: {
            today: 120,
            sameDayLastWeek: 90,
            detailUrl: "/api/v1/reports/sales",
          },
          transactionCount: {
            today: 4,
            sameDayLastWeek: 3,
            detailUrl: "/api/v1/reports/sales",
          },
          averageBasket: {
            today: 30,
            sameDayLastWeek: 28,
            detailUrl: "/api/v1/reports/sales",
          },
          itemsSold: {
            today: 12,
            sameDayLastWeek: 10,
            detailUrl: "/api/v1/reports/sales",
          },
          cashInDrawer: {
            today: 80,
            sameDayLastWeek: 70,
            detailUrl: "/api/v1/reports/staff",
          },
          lowStockWarnings: 1,
          expiryWarnings: 0,
          topSellers: [],
          grossProfit: 40,
        }),
      ),
      http.get("*/api/v1/reports/sales", () =>
        HttpResponse.json({ totalSales: 120, transactions: 1, rows: [] }),
      ),
      http.get("*/api/v1/reports/profit", () =>
        HttpResponse.json({ grossProfit: 40, rows: [] }),
      ),
    );
    expect((await fetchDashboard()).sales.today).toBe("120");
    const sales = await fetchReport("sales", FILTER);
    expect("totalSales" in sales && sales.totalSales).toBe("120");
    const profit = await fetchReport("profit", FILTER);
    expect("grossProfit" in profit && profit.grossProfit).toBe("40");
  });

  it("starts export jobs, schedules, and notification read flows", async () => {
    const jobId = "c1111111-1111-4111-8111-111111111111";
    const scheduleId = "d1111111-1111-4111-8111-111111111111";
    const notificationId = "b1111111-1111-4111-8111-111111111111";
    let attempts = 0;
    server.use(
      http.get("*/api/v1/reports/:reportType/export", () =>
        HttpResponse.json({ jobId, status: "Pending" }, { status: 202 }),
      ),
      http.get("*/api/v1/reports/export-jobs/:id", () => {
        attempts += 1;
        if (attempts < 2) {
          return HttpResponse.json({ jobId, status: "Pending" }, { status: 202 });
        }
        return new HttpResponse("ok", { status: 200 });
      }),
      http.post("*/api/v1/reports/schedules", () =>
        HttpResponse.json({
          id: scheduleId,
          reportType: "sales",
          cadence: "Daily",
          format: "csv",
          recipients: ["owner@kwame.gh"],
          nextRunAt: new Date().toISOString(),
          isActive: true,
        }),
      ),
      http.delete("*/api/v1/reports/schedules/:id", () => HttpResponse.json(true)),
      http.get("*/api/v1/notifications", () =>
        HttpResponse.json({
          items: [
            {
              id: notificationId,
              type: "LowStock",
              channel: "InApp",
              title: "Sugar",
              occurrences: 2,
              isRead: false,
              lastRaisedAt: new Date().toISOString(),
            },
          ],
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/notifications/:id/read", () => HttpResponse.json(true)),
      http.post("*/api/v1/notifications/read-all", () => HttpResponse.json(1)),
      http.get("*/api/v1/notification-preferences", () =>
        HttpResponse.json([
          { type: "LowStock", channel: "Push", isEnabled: false, threshold: 5 },
        ]),
      ),
      http.put("*/api/v1/notification-preferences", async ({ request }) => {
        const body = (await request.json()) as { preferences: unknown[] };
        return HttpResponse.json(body.preferences);
      }),
    );

    expect((await startReportExport("sales", "csv", FILTER)).jobId).toBe(jobId);
    expect((await pollExportJob(jobId)).status).toBe("Pending");
    expect((await pollExportJob(jobId)).status).toBe("Ready");
    expect(
      (
        await createReportSchedule({
          reportType: "sales",
          cadence: "Daily",
          format: "csv",
          recipients: ["owner@kwame.gh"],
        })
      ).isActive,
    ).toBe(true);
    await deactivateReportSchedule(scheduleId);
    expect((await fetchNotifications()).totalCount).toBe(1);
    await markNotificationRead(notificationId);
    expect(await markAllNotificationsRead()).toBe(1);
    expect((await fetchNotificationPreferences())[0]?.channel).toBe("Push");
    expect(
      (
        await updateNotificationPreferences([
          { type: "LowStock", channel: "Push", isEnabled: true, threshold: 5 },
        ])
      )[0]?.isEnabled,
    ).toBe(true);
  });
});
