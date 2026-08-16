import { z } from "zod";
import {
  ifMatchHeaders,
  inventoryxClient,
} from "../../../../shared/api/client/inventoryx-client";
import { parseResource, parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  apiQuantitySchema,
  toApiNullish,
  toApiNumber,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { quantityStringSchema } from "../../../../shared/money/decimal";

export const COUNT_SCOPES = ["Full", "Cycle", "Spot"] as const;

export const countLineSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  expectedQty: apiQuantitySchema,
  countedQty: apiQuantitySchema.nullish(),
  varianceQty: apiQuantitySchema,
  varianceValue: apiDecimalSchema,
});

export const stockCountSchema = z.object({
  id: uuidSchema,
  scope: z.string(),
  status: z.string(),
  locationId: uuidSchema,
  lines: z.array(countLineSchema),
});

export type StockCountRecord = z.infer<typeof stockCountSchema>;

export const openCountInputSchema = z.object({
  locationId: z.string().min(1),
  scope: z.enum(COUNT_SCOPES),
  productIds: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
});

export type OpenCountInput = z.input<typeof openCountInputSchema>;

export async function openStockCount(input: OpenCountInput): Promise<{
  count: StockCountRecord;
  etag: string | undefined;
}> {
  const parsed = openCountInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/counts", {
    body: {
      locationId: parsed.locationId,
      scope: parsed.scope,
      productIds: parsed.productIds,
      categoryId: toApiNullish(parsed.categoryId),
    },
  });
  const { value, etag } = parseResource(outcome, stockCountSchema, "Stock count");
  return { count: value, etag };
}

export async function fetchStockCount(id: string): Promise<{
  count: StockCountRecord;
  etag: string | undefined;
}> {
  const outcome = await inventoryxClient.GET("/api/v1/counts/{id}", {
    params: { path: { id } },
  });
  const { value, etag } = parseResource(outcome, stockCountSchema, "Stock count");
  return { count: value, etag };
}

export const updateCountLinesInputSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        countedQty: quantityStringSchema,
      }),
    )
    .min(1),
});

export type UpdateCountLinesInput = z.input<typeof updateCountLinesInputSchema>;

export async function updateCountLines(
  id: string,
  input: UpdateCountLinesInput,
  etag?: string,
): Promise<{ count: StockCountRecord; etag: string | undefined }> {
  const parsed = updateCountLinesInputSchema.parse(input);
  const outcome = await inventoryxClient.PUT("/api/v1/counts/{id}/lines", {
    params: { path: { id } },
    body: {
      lines: parsed.lines.map((line) => ({
        lineId: line.lineId,
        countedQty: toApiNumber(line.countedQty),
      })),
    },
    headers: ifMatchHeaders(etag),
  });
  const { value, etag: next } = parseResource(
    outcome,
    stockCountSchema,
    "Stock count lines",
  );
  return { count: value, etag: next };
}

export async function submitStockCount(
  id: string,
  etag?: string,
): Promise<StockCountRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/counts/{id}/submit", {
    params: { path: { id } },
    headers: ifMatchHeaders(etag),
  });
  return parseValue(outcome, stockCountSchema, "Submit count");
}

export async function approveStockCount(id: string): Promise<StockCountRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/counts/{id}/approve", {
    params: { path: { id } },
  });
  return parseValue(outcome, stockCountSchema, "Approve count");
}

export async function rejectStockCount(id: string): Promise<StockCountRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/counts/{id}/reject", {
    params: { path: { id } },
  });
  return parseValue(outcome, stockCountSchema, "Reject count");
}
