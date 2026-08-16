import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  apiQuantitySchema,
  clampPageSize,
  toApiNullish,
  toApiNumber,
  utcInstantSchema,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { quantityStringSchema } from "../../../../shared/money/decimal";

export const stockLevelSchema = z.object({
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

export interface StockQuery {
  locationId?: string;
  productId?: string;
  categoryId?: string;
  belowReorder?: boolean;
  groupBy?: "product";
  page?: number;
  pageSize?: number;
}

export async function fetchStockLevels(query: StockQuery = {}): Promise<PagedStock> {
  const params: Record<string, string | number | boolean> = {
    page: Math.max(1, Math.trunc(query.page ?? 1)),
    pageSize: clampPageSize(query.pageSize ?? 50),
  };
  if (query.locationId) params["locationId"] = query.locationId;
  if (query.productId) params["productId"] = query.productId;
  if (query.categoryId) params["categoryId"] = query.categoryId;
  if (query.belowReorder !== undefined) params["belowReorder"] = query.belowReorder;
  if (query.groupBy) params["groupBy"] = query.groupBy;

  const outcome = await inventoryxClient.GET("/api/v1/stock", {
    params: { query: params },
  });
  return parseValue(outcome, pagedStockSchema, "Stock levels");
}

export const stockMovementSchema = z.object({
  id: uuidSchema,
  type: z.string(),
  productId: uuidSchema,
  variantId: uuidSchema.nullish(),
  batchId: uuidSchema.nullish(),
  locationId: uuidSchema,
  qtyDelta: apiQuantitySchema,
  reasonCode: z.string().nullish(),
  note: z.string().nullish(),
  userId: z.string().nullish(),
  occurredAt: utcInstantSchema,
  /** Present when InventoryX links a correction to its original movement. */
  correlationId: uuidSchema.nullish(),
});

export type StockMovementRecord = z.infer<typeof stockMovementSchema>;

const pagedMovementsSchema = z.object({
  items: z.array(stockMovementSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export interface MovementQuery {
  productId?: string;
  locationId?: string;
  type?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchStockMovements(
  query: MovementQuery = {},
): Promise<z.infer<typeof pagedMovementsSchema>> {
  const params: Record<string, string | number> = {
    page: Math.max(1, Math.trunc(query.page ?? 1)),
    pageSize: clampPageSize(query.pageSize ?? 50),
  };
  if (query.productId) params["productId"] = query.productId;
  if (query.locationId) params["locationId"] = query.locationId;
  if (query.type) params["type"] = query.type;
  if (query.userId) params["userId"] = query.userId;
  if (query.from) params["from"] = query.from;
  if (query.to) params["to"] = query.to;

  const outcome = await inventoryxClient.GET("/api/v1/stock/movements", {
    params: { query: params },
  });
  return parseValue(outcome, pagedMovementsSchema, "Stock movements");
}

export const correctMovementInputSchema = z.object({
  correctedQtyDelta: quantityStringSchema,
  reasonCode: z.string().min(1),
  note: z.string().optional(),
});

export type CorrectMovementInput = z.infer<typeof correctMovementInputSchema>;

export async function correctMovement(
  movementId: string,
  input: CorrectMovementInput,
): Promise<StockMovementRecord> {
  const parsed = correctMovementInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/stock/movements/{id}/correct", {
    params: { path: { id: movementId } },
    body: {
      correctedQtyDelta: toApiNumber(parsed.correctedQtyDelta),
      reasonCode: parsed.reasonCode,
      note: toApiNullish(parsed.note),
    },
  });
  return parseValue(outcome, stockMovementSchema, "Movement correction");
}
