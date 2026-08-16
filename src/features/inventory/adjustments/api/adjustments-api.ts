import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  toApiNullish,
  toApiNumber,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { quantityStringSchema } from "../../../../shared/money/decimal";

export const adjustmentReasonSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
});

export type AdjustmentReason = z.infer<typeof adjustmentReasonSchema>;

export async function fetchAdjustmentReasons(): Promise<AdjustmentReason[]> {
  const outcome = await inventoryxClient.GET("/api/v1/stock/adjustment-reasons");
  return parseValue(outcome, z.array(adjustmentReasonSchema), "Adjustment reasons");
}

export const adjustmentLineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  qtyDelta: quantityStringSchema,
  unitCost: z.string().optional(),
});

export const adjustmentInputSchema = z.object({
  locationId: z.string().min(1),
  reasonCode: z.string().min(1),
  note: z.string().optional(),
  lines: z.array(adjustmentLineSchema).min(1),
});

export type AdjustmentInput = z.input<typeof adjustmentInputSchema>;

export const adjustmentOutcomeSchema = z.object({
  status: z.string(),
  movementProductIds: z.array(uuidSchema).default([]),
  adjustmentId: uuidSchema.nullish(),
});

export type AdjustmentOutcome = z.infer<typeof adjustmentOutcomeSchema>;

function toAdjustmentBody(input: AdjustmentInput) {
  const parsed = adjustmentInputSchema.parse(input);
  return {
    locationId: parsed.locationId,
    reasonCode: parsed.reasonCode,
    note: toApiNullish(parsed.note),
    lines: parsed.lines.map((line) => ({
      productId: line.productId,
      variantId: toApiNullish(line.variantId),
      qtyDelta: toApiNumber(line.qtyDelta),
      unitCost: line.unitCost !== undefined ? toApiNumber(line.unitCost) : null,
    })),
  };
}

export async function recordAdjustment(
  input: AdjustmentInput,
): Promise<AdjustmentOutcome> {
  const outcome = await inventoryxClient.POST("/api/v1/stock/adjustments", {
    body: toAdjustmentBody(input),
  });
  return parseValue(outcome, adjustmentOutcomeSchema, "Stock adjustment");
}

export async function approveAdjustment(
  adjustmentId: string,
): Promise<AdjustmentOutcome> {
  const outcome = await inventoryxClient.POST(
    "/api/v1/stock/adjustments/{id}/approve",
    {
      params: { path: { id: adjustmentId } },
    },
  );
  return parseValue(outcome, adjustmentOutcomeSchema, "Approve adjustment");
}

export async function rejectAdjustment(
  adjustmentId: string,
): Promise<AdjustmentOutcome> {
  const outcome = await inventoryxClient.POST("/api/v1/stock/adjustments/{id}/reject", {
    params: { path: { id: adjustmentId } },
  });
  return parseValue(outcome, adjustmentOutcomeSchema, "Reject adjustment");
}

export const consumptionInputSchema = adjustmentInputSchema;
export type ConsumptionInput = AdjustmentInput;

export async function recordConsumption(
  input: ConsumptionInput,
): Promise<AdjustmentOutcome> {
  const outcome = await inventoryxClient.POST("/api/v1/stock/consumption", {
    body: toAdjustmentBody(input),
  });
  return parseValue(outcome, adjustmentOutcomeSchema, "Internal consumption");
}
