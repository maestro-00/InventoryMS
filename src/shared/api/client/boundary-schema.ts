import { z } from "zod";
import { decimalStringSchema, quantityStringSchema } from "../../money/decimal";

export const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Expected a UUID",
  );

export const utcInstantSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
    "Expected a UTC instant",
  );

const MAX_PAGE_SIZE = 200;

/**
 * InventoryX serializes money and quantities as JSON numbers. Everything inside the
 * frontend works with canonical decimal strings so no precision is lost and no total is
 * recomputed; a provider-supplied string is preserved verbatim.
 */
function toDecimalString(value: string | number): string {
  return typeof value === "string" ? value : value.toString();
}

export const apiDecimalSchema = z
  .union([z.string(), z.number()])
  .transform(toDecimalString)
  .pipe(decimalStringSchema);

export const apiQuantitySchema = z
  .union([z.string(), z.number()])
  .transform(toDecimalString)
  .pipe(quantityStringSchema);

/**
 * InventoryX request bodies use JSON numbers for money/qty. Call after Zod has
 * validated the canonical decimal string so the wire value stays within domain rules.
 */
export function toApiNumber(value: string): number {
  return Number(value);
}

/**
 * OpenAPI optional fields are typically `T | null`. With exactOptionalPropertyTypes,
 * passing `undefined` is rejected — coerce missing values to null at the boundary.
 */
export function toApiNullish<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

export function clampPageSize(pageSize: number): number {
  return Math.min(Math.max(Math.trunc(pageSize), 1), MAX_PAGE_SIZE);
}

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const apiEnvelopeSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int(),
  });

export const indexedDbPartitionSchema = z.object({
  partitionKey: z.string().min(1),
  tenantId: uuidSchema,
  registerId: uuidSchema,
});

export const workerMessageSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown().optional(),
});

export const broadcastMessageSchema = z.object({
  channel: z.literal("inventoryms-sync"),
  tenantId: uuidSchema,
  registerId: uuidSchema,
  type: z.enum(["status", "lock", "snapshot"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export function parseBoundary<T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`${label} failed boundary validation`);
  }
  return result.data;
}

export { decimalStringSchema, quantityStringSchema };
