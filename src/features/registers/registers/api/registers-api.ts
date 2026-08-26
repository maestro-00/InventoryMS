import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseResource, parseValue } from "../../../../shared/api/client/api-result";
import { ifMatchHeaders } from "../../../../shared/api/client/inventoryx-client";
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

export type RegisterRecord = z.infer<typeof registerSchema> & {
  etag?: string;
};

export const openShiftInputSchema = z.object({
  registerId: z.string().min(1, "Select a register"),
  openingFloat: decimalStringSchema,
});

export type OpenShiftInput = z.infer<typeof openShiftInputSchema>;

const shiftSchema = z.object({
  id: uuidSchema,
  registerId: uuidSchema,
  openedBy: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  openedAt: utcInstantSchema,
  openingFloat: apiDecimalSchema,
  status: z.string(),
});

export type ShiftRecord = z.infer<typeof shiftSchema>;

export { shiftSchema };

export type ShiftStatusFilter = "Open" | "Closed";

/** TanStack Query key for tenant open shifts (`GET /api/v1/shifts?status=Open`). */
export const openShiftsQueryKey = ["shifts", "open"] as const;

export function openShiftsForRegisterQueryKey(registerId: string) {
  return ["shifts", "open", registerId] as const;
}

export async function fetchRegisters(locationId?: string): Promise<RegisterRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/registers", {
    params: { query: locationId ? { locationId } : {} },
  });
  // Collection list ETags are not per-register. Do not stamp them onto rows —
  // that would send the wrong If-Match on PATCH. Omit etag unless a future
  // per-item ETag is available; updateRegister skips If-Match when undefined.
  return parseValue(outcome, z.array(registerSchema), "Registers");
}

export async function createRegister(input: RegisterInput): Promise<RegisterRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/registers", {
    body: registerInputSchema.parse(input),
  });
  const { value, etag } = parseResource(outcome, registerSchema, "Register");
  return etag ? { ...value, etag } : value;
}

export const updateRegisterInputSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRegisterInput = z.infer<typeof updateRegisterInputSchema>;

export async function updateRegister(
  id: string,
  input: UpdateRegisterInput,
  ifMatch?: string,
): Promise<RegisterRecord> {
  const parsed = updateRegisterInputSchema.parse(input);
  const outcome = await inventoryxClient.PATCH("/api/v1/registers/{id}", {
    params: { path: { id } },
    body: {
      name: parsed.name ?? null,
      isActive: parsed.isActive ?? null,
    },
    headers: ifMatchHeaders(ifMatch),
  });
  const { value, etag } = parseResource(outcome, registerSchema, "Register update");
  return etag ? { ...value, etag } : value;
}

export async function fetchOpenShifts(filters?: {
  registerId?: string;
}): Promise<ShiftRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/shifts", {
    params: {
      query: {
        status: "Open",
        ...(filters?.registerId ? { registerId: filters.registerId } : {}),
      },
    },
  });
  return parseValue(outcome, z.array(shiftSchema), "Open shifts");
}

export async function fetchRegisterShifts(
  registerId: string,
  status?: ShiftStatusFilter,
): Promise<ShiftRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/registers/{registerId}/shifts", {
    params: {
      path: { registerId },
      query: status ? { status } : {},
    },
  });
  return parseValue(outcome, z.array(shiftSchema), "Register shifts");
}

export async function openShift(input: OpenShiftInput): Promise<ShiftRecord> {
  const parsed = openShiftInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/registers/{registerId}/shifts", {
    params: { path: { registerId: parsed.registerId } },
    body: { openingFloat: toApiNumber(parsed.openingFloat) },
  });
  return parseValue(outcome, shiftSchema, "Shift");
}
