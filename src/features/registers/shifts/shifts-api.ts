import { z } from "zod";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  toApiNumber,
  uuidSchema,
} from "../../../shared/api/client/boundary-schema";
import { decimalStringSchema } from "../../../shared/money/decimal";
import { shiftSchema, type ShiftRecord } from "../registers/api/registers-api";

export { shiftSchema, type ShiftRecord };

const closeInputSchema = z.object({
  shiftId: uuidSchema,
  closingCounted: decimalStringSchema,
});

export type CloseShiftInput = z.infer<typeof closeInputSchema>;

export type CloseShiftResult = ShiftRecord;

export async function closeShift(input: CloseShiftInput): Promise<CloseShiftResult> {
  const parsed = closeInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/shifts/{shiftId}/close", {
    params: { path: { shiftId: parsed.shiftId } },
    body: { closingCounted: toApiNumber(parsed.closingCounted) },
  });
  return parseValue(outcome, shiftSchema, "Close shift");
}

const cashDirectionSchema = z.enum(["CashIn", "CashOut"]);
const cashReasonSchema = z.enum(["PettyCash", "Banking", "ChangeOrder", "Other"]);

export const cashMovementInputSchema = z.object({
  shiftId: uuidSchema,
  direction: cashDirectionSchema,
  reason: cashReasonSchema,
  amount: decimalStringSchema,
  note: z.string().optional(),
});

export type CashMovementInput = z.infer<typeof cashMovementInputSchema>;

const cashMovementSchema = z.object({
  id: uuidSchema,
  type: z.string().nullish().transform((value) => value ?? ""),
  reason: z.string().nullish().transform((value) => value ?? ""),
  amount: apiDecimalSchema,
});

export type CashMovementRecord = z.infer<typeof cashMovementSchema>;

function wireCashReason(
  reason: z.infer<typeof cashReasonSchema>,
  note?: string,
): string {
  const trimmed = note?.trim();
  return trimmed ? `${reason}: ${trimmed}` : reason;
}

export async function recordCashMovement(
  input: CashMovementInput,
): Promise<CashMovementRecord> {
  const parsed = cashMovementInputSchema.parse(input);
  const outcome = await inventoryxClient.POST(
    "/api/v1/shifts/{shiftId}/cash-movements",
    {
      params: { path: { shiftId: parsed.shiftId } },
      body: {
        type: parsed.direction,
        amount: toApiNumber(parsed.amount),
        reason: wireCashReason(parsed.reason, parsed.note),
      },
    },
  );
  return parseValue(outcome, cashMovementSchema, "Cash movement");
}

const zReportSchema = z.object({
  shiftId: uuidSchema,
  salesTotal: apiDecimalSchema,
  refundTotal: apiDecimalSchema.optional(),
  discountTotal: apiDecimalSchema.optional(),
  voidTotal: apiDecimalSchema.optional(),
  expectedCash: apiDecimalSchema,
  countedCash: apiDecimalSchema,
  variance: apiDecimalSchema,
  tenders: z
    .array(z.object({ tender: z.string(), amount: apiDecimalSchema }))
    .default([]),
});

export type ZReportRecord = z.infer<typeof zReportSchema>;

export async function fetchZReport(shiftId: string): Promise<ZReportRecord> {
  const outcome = await inventoryxClient.GET("/api/v1/shifts/{shiftId}/z-report", {
    params: { path: { shiftId } },
  });
  return parseValue(outcome, zReportSchema, "Z report");
}
