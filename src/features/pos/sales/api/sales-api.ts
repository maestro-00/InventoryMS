import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  apiQuantitySchema,
  clampPageSize,
  utcInstantSchema,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";

export const TENDERS = [
  "Cash",
  "Card",
  "MobileMoney",
  "BankTransfer",
  "Cheque",
] as const;
export type Tender = (typeof TENDERS)[number];

const saleLineSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.nullish(),
  batchId: uuidSchema.nullish(),
  productName: z.string(),
  qty: apiQuantitySchema,
  unitPrice: apiDecimalSchema,
  lineDiscount: apiDecimalSchema,
  taxAmount: apiDecimalSchema,
  lineTotal: apiDecimalSchema,
  taxComponents: z.string().default("[]"),
  note: z.string().nullish(),
  qtyReturned: apiQuantitySchema.optional().default("0"),
});

export type SaleLineRecord = z.infer<typeof saleLineSchema>;

const salePaymentSchema = z.object({
  tender: z.string(),
  amount: apiDecimalSchema,
  reference: z.string().nullish(),
});

/** Every monetary field is the server's authoritative value; the client never recomputes. */
export const saleSchema = z.object({
  id: uuidSchema,
  clientSaleId: uuidSchema,
  locationId: uuidSchema,
  registerId: uuidSchema,
  shiftId: uuidSchema,
  cashierId: z.string(),
  status: z.string(),
  subtotal: apiDecimalSchema,
  discountTotal: apiDecimalSchema,
  taxTotal: apiDecimalSchema,
  grandTotal: apiDecimalSchema,
  changeDue: apiDecimalSchema,
  stockConflictFlag: z.boolean().default(false),
  occurredAt: utcInstantSchema,
  lines: z.array(saleLineSchema).default([]),
  payments: z.array(salePaymentSchema).default([]),
});

export type SaleRecord = z.infer<typeof saleSchema>;

const pagedSalesSchema = z.object({
  items: z.array(saleSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export type PagedSales = z.infer<typeof pagedSalesSchema>;

export interface SalesQuery {
  page?: number;
  pageSize?: number;
  locationId?: string;
  registerId?: string;
  status?: string;
}

export async function fetchSales(query: SalesQuery = {}): Promise<PagedSales> {
  const params: Record<string, string | number> = {
    page: Math.max(1, Math.trunc(query.page ?? 1)),
    pageSize: clampPageSize(query.pageSize ?? 50),
  };
  if (query.locationId) params["locationId"] = query.locationId;
  if (query.registerId) params["registerId"] = query.registerId;
  if (query.status) params["status"] = query.status;

  const outcome = await inventoryxClient.GET("/api/v1/sales", {
    params: { query: params },
  });
  return parseValue(outcome, pagedSalesSchema, "Sale history");
}

export async function fetchSale(id: string): Promise<SaleRecord> {
  const outcome = await inventoryxClient.GET("/api/v1/sales/{id}", {
    params: { path: { id } },
  });
  return parseValue(outcome, saleSchema, "Sale");
}
