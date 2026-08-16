import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  apiQuantitySchema,
  utcInstantSchema,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";

export const alertSchema = z.object({
  id: uuidSchema,
  type: z.string(),
  title: z.string(),
  body: z.string().nullish(),
  channel: z.string().nullish(),
  lastRaisedAt: utcInstantSchema,
  resolvedAt: utcInstantSchema.nullish(),
});

export type AlertRecord = z.infer<typeof alertSchema>;

export async function fetchAlerts(): Promise<AlertRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/alerts");
  return parseValue(outcome, z.array(alertSchema), "Stock alerts");
}

export const reorderSuggestionSchema = z.object({
  productId: uuidSchema,
  productName: z.string(),
  sku: z.string().nullish(),
  supplierId: uuidSchema.nullish(),
  supplierName: z.string().nullish(),
  currentStock: apiQuantitySchema,
  reorderPoint: apiQuantitySchema,
  suggestedQty: apiQuantitySchema,
  leadTimeDays: z.number().int().nullish(),
  unitCost: apiDecimalSchema,
});

export type ReorderSuggestion = z.infer<typeof reorderSuggestionSchema>;

const reorderSuggestionsSchema = z.object({
  items: z.array(reorderSuggestionSchema),
});

export async function fetchReorderSuggestions(
  locationId?: string,
): Promise<ReorderSuggestion[]> {
  const outcome = await inventoryxClient.GET("/api/v1/reorder/suggestions", {
    params: {
      query: locationId ? { locationId } : {},
    },
  });
  const parsed = parseValue(outcome, reorderSuggestionsSchema, "Reorder suggestions");
  return parsed.items;
}
