import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  apiQuantitySchema,
  clampPageSize,
  toApiNullish,
  toApiNumber,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { quantityStringSchema } from "../../../../shared/money/decimal";

export const openingStockInputSchema = z.object({
  locationId: z.string().min(1, "Select a location"),
  reasonCode: z.string().default("Correction"),
  note: z.string().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        qtyDelta: quantityStringSchema,
        unitCost: z.string().optional(),
      }),
    )
    .min(1, "Add at least one product"),
});

export type OpeningStockInput = z.input<typeof openingStockInputSchema>;

const adjustmentOutcomeSchema = z.object({
  status: z.string(),
  movementProductIds: z.array(uuidSchema).default([]),
  adjustmentId: uuidSchema.nullish(),
});

export type AdjustmentOutcome = z.infer<typeof adjustmentOutcomeSchema>;

const stockLevelSchema = z.object({
  productId: uuidSchema,
  productName: z.string().nullish(),
  variantId: uuidSchema.nullish(),
  locationId: uuidSchema.nullish(),
  batchId: uuidSchema.nullish(),
  qtyOnHand: apiQuantitySchema,
  qtyInTransit: apiQuantitySchema,
  qtyQuarantine: apiQuantitySchema,
  /** Absent without ViewProfit (FR-078). */
  avgUnitCost: apiDecimalSchema.nullish(),
});

export type StockLevelRecord = z.infer<typeof stockLevelSchema>;

const pagedStockSchema = z.object({
  items: z.array(stockLevelSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export type PagedStock = z.infer<typeof pagedStockSchema>;

/**
 * Opening stock is recorded as a reasoned `Correction` adjustment so it lands in the
 * same append-only movement ledger as every other stock change.
 */
export async function recordOpeningStock(
  input: OpeningStockInput,
): Promise<AdjustmentOutcome> {
  const parsed = openingStockInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/stock/adjustments", {
    body: {
      locationId: parsed.locationId,
      reasonCode: parsed.reasonCode,
      note: toApiNullish(parsed.note),
      lines: parsed.lines.map((line) => ({
        productId: line.productId,
        variantId: toApiNullish(line.variantId),
        qtyDelta: toApiNumber(line.qtyDelta),
        unitCost: line.unitCost !== undefined ? toApiNumber(line.unitCost) : null,
      })),
    },
  });
  return parseValue(outcome, adjustmentOutcomeSchema, "Opening stock");
}

export interface StockQuery {
  locationId?: string;
  productId?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchStock(query: StockQuery = {}): Promise<PagedStock> {
  const params: Record<string, string | number> = {
    page: Math.max(1, Math.trunc(query.page ?? 1)),
    pageSize: clampPageSize(query.pageSize ?? 50),
  };
  if (query.locationId) params["locationId"] = query.locationId;
  if (query.productId) params["productId"] = query.productId;

  const outcome = await inventoryxClient.GET("/api/v1/stock", {
    params: { query: params },
  });
  return parseValue(outcome, pagedStockSchema, "Stock levels");
}
