import { z } from "zod";
import { authorizedFetch } from "../../../shared/api/client/authorized-fetch";
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

export const PO_STATUSES = [
  "Draft",
  "Submitted",
  "AwaitingApproval",
  "Approved",
  "Sent",
  "PartiallyReceived",
  "Received",
  "ClosedShort",
  "Cancelled",
  "Rejected",
] as const;

export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export const supplierSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  paymentTerms: z.string().nullish(),
  leadTimeDays: z.number().int().nullish(),
  currency: z.string().nullish(),
});

export type SupplierRecord = z.infer<typeof supplierSchema>;

export const supplierInputSchema = z.object({
  name: z.string().min(1, "Enter a supplier name"),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  currency: z.string().optional(),
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;

export const purchaseOrderLineSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.nullish(),
  description: z.string(),
  orderedQty: apiDecimalSchema,
  receivedQty: apiDecimalSchema,
  damagedQty: apiDecimalSchema,
  unitCost: apiDecimalSchema,
});

export const purchaseOrderSchema = z.object({
  id: uuidSchema,
  supplierId: uuidSchema,
  deliverToLocationId: uuidSchema,
  status: z.string(),
  origin: z.string(),
  originReferenceId: uuidSchema.nullish(),
  requiredBy: z.string().nullish(),
  notes: z.string().nullish(),
  total: apiDecimalSchema,
  lines: z.array(purchaseOrderLineSchema).default([]),
  etag: z.string().optional(),
});

export type PurchaseOrderRecord = z.infer<typeof purchaseOrderSchema>;

const pagedOrdersSchema = z.object({
  items: z.array(purchaseOrderSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export async function fetchSuppliers(): Promise<SupplierRecord[]> {
  const response = await authedFetch("/api/v1/suppliers");
  if (!response.ok) throw new Error("Failed to load suppliers");
  return z.array(supplierSchema).parse(await response.json());
}

export async function createSupplier(input: SupplierInput): Promise<SupplierRecord> {
  const parsed = supplierInputSchema.parse(input);
  const response = await authedFetch("/api/v1/suppliers", {
    method: "POST",
    body: JSON.stringify({
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
    }),
  });
  if (!response.ok) throw new Error("Failed to create supplier");
  return supplierSchema.parse(await response.json());
}

export async function fetchSupplierProducts(supplierId: string) {
  const response = await authedFetch(`/api/v1/suppliers/${supplierId}/products`);
  if (!response.ok) throw new Error("Failed to load supplier products");
  return z
    .array(
      z.object({
        productId: uuidSchema,
        supplierCode: z.string().nullish(),
        lastPrice: apiDecimalSchema.nullish(),
      }),
    )
    .parse(await response.json());
}

export async function fetchSupplierOrders(supplierId: string) {
  const response = await authedFetch(`/api/v1/suppliers/${supplierId}/orders`);
  if (!response.ok) throw new Error("Failed to load supplier orders");
  const body: unknown = await response.json();
  if (Array.isArray(body))
    return z.array(purchaseOrderSchema.partial({ lines: true })).parse(body);
  return [];
}

export async function fetchSupplierPerformance(supplierId: string) {
  const response = await authedFetch(`/api/v1/suppliers/${supplierId}/performance`);
  if (!response.ok) throw new Error("Failed to load supplier performance");
  return z
    .object({
      onTimeRate: z.number().nullish(),
      fillRate: z.number().nullish(),
      averageLeadTimeDays: z.number().nullish(),
    })
    .loose()
    .parse(await response.json());
}

export async function putSupplierProducts(
  supplierId: string,
  items: Array<{ productId: string; supplierCode?: string; price: number }>,
): Promise<void> {
  const response = await authedFetch(`/api/v1/suppliers/${supplierId}/products`, {
    method: "PUT",
    body: JSON.stringify(items),
  });
  if (!response.ok) throw new Error("Failed to save supplier products");
}

export async function fetchPurchaseOrders(
  query: {
    status?: string;
    supplierId?: string;
    overdue?: boolean;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<z.infer<typeof pagedOrdersSchema>> {
  const params = new URLSearchParams({
    page: String(Math.max(1, query.page ?? 1)),
    pageSize: String(clampPageSize(query.pageSize ?? 50)),
  });
  if (query.status) params.set("status", query.status);
  if (query.supplierId) params.set("supplierId", query.supplierId);
  if (query.overdue) params.set("overdue", "true");
  const response = await authedFetch(`/api/v1/purchase-orders?${params}`);
  if (!response.ok) throw new Error("Failed to load purchase orders");
  const body: unknown = await response.json();
  if (Array.isArray(body)) {
    return {
      items: z.array(purchaseOrderSchema).parse(body),
      page: 1,
      pageSize: body.length,
      totalCount: body.length,
    };
  }
  return pagedOrdersSchema.parse(body);
}

export async function createPurchaseOrder(input: {
  supplierId: string;
  deliverToLocationId: string;
  origin?: string;
  notes?: string;
  lines: Array<{
    productId: string;
    description: string;
    orderedQty: string;
    unitCost: string;
  }>;
}): Promise<PurchaseOrderRecord> {
  const response = await authedFetch("/api/v1/purchase-orders", {
    method: "POST",
    body: JSON.stringify({
      supplierId: input.supplierId,
      deliverToLocationId: input.deliverToLocationId,
      origin: input.origin ?? "Manual",
      notes: input.notes,
      lines: input.lines.map((line) => ({
        productId: line.productId,
        description: line.description,
        orderedQty: Number(line.orderedQty),
        unitCost: Number(line.unitCost),
      })),
    }),
  });
  if (!response.ok) throw new Error("Failed to create purchase order");
  return purchaseOrderSchema.parse(await response.json());
}

export async function patchPurchaseOrder(
  id: string,
  input: { notes?: string | null },
  etag?: string,
): Promise<PurchaseOrderRecord> {
  const headers: HeadersInit = etag ? { "If-Match": etag } : {};
  const response = await authedFetch(`/api/v1/purchase-orders/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(input),
  });
  if (response.status === 412)
    throw new Error("Purchase order was changed elsewhere (412)");
  if (!response.ok) throw new Error("Failed to update purchase order");
  const body = purchaseOrderSchema.parse(await response.json());
  return {
    ...body,
    etag: response.headers.get("ETag") ?? body.etag,
  };
}

export async function applyReorderSuggestions(input: {
  deliverToLocationId: string;
  selections: Array<{
    productId: string;
    supplierId: string;
    qty: number;
    unitCost: number;
  }>;
}): Promise<PurchaseOrderRecord[]> {
  const response = await authedFetch("/api/v1/reorder/suggestions/apply", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to apply reorder suggestions");
  return z.array(purchaseOrderSchema).parse(await response.json());
}

async function postOrderAction(
  id: string,
  action: string,
  body?: unknown,
): Promise<PurchaseOrderRecord> {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const response = await authedFetch(`/api/v1/purchase-orders/${id}/${action}`, init);
  if (!response.ok) {
    if (response.status === 423) throw new Error("Approval required (423)");
    throw new Error(`Purchase order ${action} failed`);
  }
  return purchaseOrderSchema.parse(await response.json());
}

export const submitPurchaseOrder = (id: string) => postOrderAction(id, "submit");
export const approvePurchaseOrder = (id: string) => postOrderAction(id, "approve");
export const rejectPurchaseOrder = (id: string) => postOrderAction(id, "reject");
export const cancelPurchaseOrder = (id: string, reason: string) =>
  postOrderAction(id, "cancel", { reason });
export const closePurchaseOrderShort = (id: string, reason: string) =>
  postOrderAction(id, "close-short", { reason });

export async function sendPurchaseOrder(id: string): Promise<{ sent: boolean }> {
  const response = await authedFetch(`/api/v1/purchase-orders/${id}/send`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to send purchase order");
  const body: unknown = await response.json().catch(() => ({ sent: true }));
  return z
    .object({ sent: z.boolean().optional() })
    .transform((row) => ({
      sent: row.sent ?? true,
    }))
    .parse(body);
}

export function purchaseOrderPdfUrl(id: string): string {
  return `${origin}/api/v1/purchase-orders/${id}/pdf`;
}

export async function recordGoodsReceipt(input: {
  purchaseOrderId: string;
  locationId: string;
  notes?: string;
  lines: Array<{
    purchaseOrderLineId: string;
    qtyReceived: number;
    qtyDamaged: number;
    unitCost: number;
    batchNumber?: string;
    expiresAt?: string;
    manufacturedAt?: string;
  }>;
}) {
  const response = await authedFetch(
    `/api/v1/purchase-orders/${input.purchaseOrderId}/receipts`,
    {
      method: "POST",
      body: JSON.stringify({
        locationId: input.locationId,
        notes: input.notes,
        lines: input.lines,
      }),
    },
  );
  if (!response.ok) throw new Error("Failed to record goods receipt");
  return z
    .object({
      id: uuidSchema,
      receiptNumber: z.string(),
      purchaseOrderId: uuidSchema,
      locationId: uuidSchema,
      purchaseOrderStatus: z.string(),
      lines: z.array(z.record(z.string(), z.unknown())).default([]),
    })
    .parse(await response.json());
}

export async function recordSupplierInvoice(input: {
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  lines: Array<{ productId: string; qty: number; unitPrice: number }>;
}) {
  const response = await authedFetch("/api/v1/supplier-invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to record supplier invoice");
  return z
    .object({
      id: uuidSchema,
      invoiceNumber: z.string(),
      hasPriceVariance: z.boolean(),
      lines: z
        .array(
          z.object({
            productId: uuidSchema,
            unitPrice: apiDecimalSchema,
            orderedUnitCost: apiDecimalSchema.nullish(),
            hasVariance: z.boolean(),
          }),
        )
        .default([]),
    })
    .parse(await response.json());
}

export async function allocateLandedCosts(input: {
  goodsReceiptId: string;
  costType: "Freight" | "Duty" | "Clearing" | "Insurance";
  totalAmount: number;
  notes?: string;
}) {
  const response = await authedFetch(
    `/api/v1/goods-receipts/${input.goodsReceiptId}/landed-costs`,
    {
      method: "POST",
      body: JSON.stringify({
        costType: input.costType,
        totalAmount: input.totalAmount,
        notes: input.notes,
      }),
    },
  );
  if (!response.ok) throw new Error("Failed to allocate landed costs");
  return z
    .object({
      goodsReceiptId: uuidSchema,
      lines: z
        .array(
          z.object({
            goodsReceiptLineId: uuidSchema,
            productId: uuidSchema,
            allocatedAmount: apiDecimalSchema,
            newUnitCost: apiDecimalSchema,
          }),
        )
        .default([]),
    })
    .parse(await response.json());
}
