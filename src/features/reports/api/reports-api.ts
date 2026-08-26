import { z } from "zod";
import { authorizedFetch } from "../../../shared/api/client/authorized-fetch";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  clampPageSize,
  uuidSchema,
} from "../../../shared/api/client/boundary-schema";

const origin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  return authorizedFetch(`${origin}${path}`, init);
}

export const reportFilterSchema = z.object({
  from: z.string(),
  to: z.string(),
  locationId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  staffId: z.string().optional(),
});

export type ReportFilter = z.infer<typeof reportFilterSchema>;

function filterQuery(filter: ReportFilter): string {
  const params = new URLSearchParams({ from: filter.from, to: filter.to });
  if (filter.locationId) params.set("locationId", filter.locationId);
  if (filter.categoryId) params.set("categoryId", filter.categoryId);
  if (filter.staffId) params.set("staffId", filter.staffId);
  return params.toString();
}

const metricSchema = z.object({
  today: apiDecimalSchema,
  sameDayLastWeek: apiDecimalSchema,
  detailUrl: z.string(),
});

const countMetricSchema = z.object({
  today: z.number().int(),
  sameDayLastWeek: z.number().int(),
  detailUrl: z.string(),
});

export const dashboardSchema = z.object({
  sales: metricSchema,
  transactionCount: countMetricSchema,
  averageBasket: metricSchema,
  itemsSold: metricSchema,
  cashInDrawer: metricSchema,
  lowStockWarnings: z.number().int(),
  expiryWarnings: z.number().int(),
  topSellers: z
    .array(
      z.object({
        productId: uuidSchema,
        productName: z.string(),
        quantity: apiDecimalSchema,
        sales: apiDecimalSchema,
        detailUrl: z.string(),
      }),
    )
    .default([]),
  grossProfit: apiDecimalSchema.nullish(),
});

export type DashboardRecord = z.infer<typeof dashboardSchema>;

export async function fetchDashboard(asOf?: string): Promise<DashboardRecord> {
  // Deferred: other report endpoints still use authedFetch; migrate with full reports rewrite.
  const outcome = await inventoryxClient.GET("/api/v1/dashboard", {
    params: { query: asOf ? { asOf } : {} },
  });
  return parseValue(outcome, dashboardSchema, "Dashboard");
}

const salesReportSchema = z.object({
  totalSales: apiDecimalSchema,
  transactions: z.number().int(),
  rows: z
    .array(
      z.object({
        saleId: uuidSchema,
        occurredAt: z.string(),
        locationId: uuidSchema,
        staffId: z.string(),
        subtotal: apiDecimalSchema,
        discount: apiDecimalSchema,
        tax: apiDecimalSchema,
        total: apiDecimalSchema,
        status: z.string(),
      }),
    )
    .default([]),
});

const profitReportSchema = z.object({
  grossProfit: apiDecimalSchema,
  rows: z
    .array(
      z.object({
        productId: uuidSchema,
        productName: z.string(),
        revenue: apiDecimalSchema,
        cost: apiDecimalSchema,
        grossProfit: apiDecimalSchema,
      }),
    )
    .default([]),
});

const stockReportSchema = z.object({
  totalValue: apiDecimalSchema,
  rows: z
    .array(
      z.object({
        productId: uuidSchema,
        productName: z.string(),
        locationId: uuidSchema,
        onHand: apiDecimalSchema,
        unitCost: apiDecimalSchema,
        value: apiDecimalSchema,
      }),
    )
    .default([]),
});

const purchasingReportSchema = z.object({
  rows: z
    .array(
      z.object({
        purchaseOrderId: uuidSchema,
        supplierId: uuidSchema,
        supplierName: z.string(),
        status: z.string(),
        requiredBy: z.string().nullish(),
        orderedValue: apiDecimalSchema,
        outstandingQuantity: apiDecimalSchema,
      }),
    )
    .default([]),
});

const staffReportSchema = z.object({
  rows: z
    .array(
      z.object({
        staffId: z.string(),
        transactions: z.number().int(),
        sales: apiDecimalSchema,
        discounts: apiDecimalSchema,
        voids: z.number().int(),
      }),
    )
    .default([]),
});

const taxReportSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalTax: apiDecimalSchema,
  components: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        rate: apiDecimalSchema,
        amount: apiDecimalSchema,
      }),
    )
    .default([]),
});

export type ReportKind = "sales" | "profit" | "stock" | "purchasing" | "staff" | "tax";

export async function fetchReport(kind: ReportKind, filter: ReportFilter) {
  const response = await authedFetch(`/api/v1/reports/${kind}?${filterQuery(filter)}`);
  if (!response.ok) throw new Error(`Failed to load ${kind} report`);
  const body: unknown = await response.json();
  switch (kind) {
    case "sales":
      return salesReportSchema.parse(body);
    case "profit":
      return profitReportSchema.parse(body);
    case "stock":
      return stockReportSchema.parse(body);
    case "purchasing":
      return purchasingReportSchema.parse(body);
    case "staff":
      return staffReportSchema.parse(body);
    case "tax":
      return taxReportSchema.parse(body);
  }
}

const scheduleSchema = z.object({
  id: uuidSchema,
  reportType: z.string(),
  cadence: z.string(),
  format: z.string(),
  recipients: z.array(z.string()).default([]),
  nextRunAt: z.string(),
  isActive: z.boolean(),
});

export async function fetchReportSchedules(page = 1, pageSize = 50) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(clampPageSize(pageSize)),
  });
  const response = await authedFetch(`/api/v1/reports/schedules?${params}`);
  if (!response.ok) throw new Error("Failed to load schedules");
  const body: unknown = await response.json();
  if (Array.isArray(body))
    return { items: z.array(scheduleSchema).parse(body), totalCount: body.length };
  return z
    .object({
      items: z.array(scheduleSchema),
      totalCount: z.number().int(),
    })
    .parse(body);
}

export async function createReportSchedule(input: {
  reportType: string;
  cadence: "Daily" | "Weekly" | "Monthly";
  format: string;
  recipients: string[];
}) {
  const response = await authedFetch("/api/v1/reports/schedules", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to create schedule");
  return scheduleSchema.parse(await response.json());
}

export async function deactivateReportSchedule(id: string): Promise<void> {
  const response = await authedFetch(`/api/v1/reports/schedules/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to deactivate schedule");
}

export async function startReportExport(
  reportType: ReportKind,
  format: "csv" | "xlsx" | "pdf",
  filter: ReportFilter,
): Promise<{ jobId: string; status: string }> {
  const response = await authedFetch(
    `/api/v1/reports/${reportType}/export?format=${format}&${filterQuery(filter)}`,
  );
  if (response.status === 202) {
    const body = z
      .object({ jobId: uuidSchema, status: z.string() })
      .parse(await response.json());
    return body;
  }
  if (!response.ok) throw new Error("Failed to start export");
  return { jobId: crypto.randomUUID(), status: "Ready" };
}

export async function pollExportJob(
  jobId: string,
): Promise<{ status: "Pending" | "Ready" | "Failed"; downloadUrl?: string }> {
  const response = await authedFetch(`/api/v1/reports/export-jobs/${jobId}`);
  if (response.status === 202) return { status: "Pending" };
  if (!response.ok) return { status: "Failed" };
  return {
    status: "Ready",
    downloadUrl: `${origin}/api/v1/reports/export-jobs/${jobId}`,
  };
}

export const notificationSchema = z.object({
  id: uuidSchema,
  type: z.string(),
  channel: z.string(),
  title: z.string(),
  message: z.string().nullish(),
  occurrences: z.number().int().default(1),
  isRead: z.boolean(),
  lastRaisedAt: z.string(),
  resolvedAt: z.string().nullish(),
});

export async function fetchNotifications(page = 1, pageSize = 50) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(clampPageSize(pageSize)),
  });
  const response = await authedFetch(`/api/v1/notifications?${params}`);
  if (!response.ok) throw new Error("Failed to load notifications");
  const body: unknown = await response.json();
  if (Array.isArray(body)) {
    return { items: z.array(notificationSchema).parse(body), totalCount: body.length };
  }
  return z
    .object({
      items: z.array(notificationSchema),
      totalCount: z.number().int(),
    })
    .parse(body);
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await authedFetch(`/api/v1/notifications/${id}/read`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to mark notification read");
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await authedFetch("/api/v1/notifications/read-all", {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to mark all read");
  const body: unknown = await response.json();
  return typeof body === "number"
    ? body
    : z.object({ count: z.number() }).parse(body).count;
}

export const preferenceSchema = z.object({
  type: z.string(),
  channel: z.string(),
  isEnabled: z.boolean(),
  threshold: apiDecimalSchema.nullish(),
});

export async function fetchNotificationPreferences() {
  const response = await authedFetch("/api/v1/notification-preferences");
  if (!response.ok) throw new Error("Failed to load preferences");
  return z.array(preferenceSchema).parse(await response.json());
}

export async function updateNotificationPreferences(
  preferences: Array<{
    type: string;
    channel: string;
    isEnabled: boolean;
    threshold?: number | null;
  }>,
) {
  const response = await authedFetch("/api/v1/notification-preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
  if (!response.ok) throw new Error("Failed to save preferences");
  return z.array(preferenceSchema).parse(await response.json());
}
