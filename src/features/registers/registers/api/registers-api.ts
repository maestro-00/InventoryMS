import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  toApiNumber,
  utcInstantSchema,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { decimalStringSchema } from "../../../../shared/money/decimal";

export const registerInputSchema = z.object({
  locationId: z.string().min(1, "Select a location"),
  name: z.string().min(1, "Enter a register name"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

const registerSchema = z.object({
  id: uuidSchema,
  locationId: uuidSchema,
  name: z.string(),
  isActive: z.boolean(),
});

export type RegisterRecord = z.infer<typeof registerSchema>;

export const openShiftInputSchema = z.object({
  registerId: z.string().min(1, "Select a register"),
  openingFloat: decimalStringSchema,
});

export type OpenShiftInput = z.infer<typeof openShiftInputSchema>;

const shiftSchema = z.object({
  id: uuidSchema,
  registerId: uuidSchema,
  openedBy: z.string(),
  openedAt: utcInstantSchema,
  openingFloat: apiDecimalSchema,
  status: z.string(),
});

export type ShiftRecord = z.infer<typeof shiftSchema>;

export async function fetchRegisters(locationId?: string): Promise<RegisterRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/registers", {
    params: { query: locationId ? { locationId } : {} },
  });
  return parseValue(outcome, z.array(registerSchema), "Registers");
}

export async function createRegister(input: RegisterInput): Promise<RegisterRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/registers", {
    body: registerInputSchema.parse(input),
  });
  return parseValue(outcome, registerSchema, "Register");
}

export async function openShift(input: OpenShiftInput): Promise<ShiftRecord> {
  const parsed = openShiftInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/registers/{registerId}/shifts", {
    params: { path: { registerId: parsed.registerId } },
    body: { openingFloat: toApiNumber(parsed.openingFloat) },
  });
  return parseValue(outcome, shiftSchema, "Shift");
}
