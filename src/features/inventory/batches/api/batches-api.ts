import { z } from "zod";
import { authorizedFetch } from "../../../../shared/api/client/authorized-fetch";
import {
  apiDecimalSchema,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";

const origin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  return authorizedFetch(`${origin}${path}`, init);
}

export const batchSchema = z.object({
  id: uuidSchema,
  batchNumber: z.string(),
  qty: apiDecimalSchema,
  expiresAt: z.string().nullish(),
  manufacturedAt: z.string().nullish(),
  damagedQty: apiDecimalSchema.nullish(),
});

export type BatchRecord = z.infer<typeof batchSchema>;

export async function fetchProductBatches(productId: string): Promise<BatchRecord[]> {
  const response = await authedFetch(`/api/v1/products/${productId}/batches`);
  if (!response.ok) throw new Error("Failed to load batches");
  const body: unknown = await response.json();
  if (Array.isArray(body)) return z.array(batchSchema).parse(body);
  return z.object({ items: z.array(batchSchema) }).parse(body).items;
}

export const batchTraceSchema = z.object({
  batchId: uuidSchema,
  batchNumber: z.string(),
  productId: uuidSchema,
  expiresAt: z.string().nullish(),
  supplier: z
    .object({
      id: uuidSchema,
      name: z.string(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
    })
    .nullish(),
  receipts: z
    .array(
      z.object({
        id: uuidSchema,
        receiptNumber: z.string(),
        receivedAt: z.string(),
        quantity: apiDecimalSchema,
        damagedQuantity: apiDecimalSchema,
        locationId: uuidSchema,
      }),
    )
    .default([]),
  sales: z
    .array(
      z.object({
        id: uuidSchema,
        occurredAt: z.string(),
        quantity: apiDecimalSchema,
        cashierId: z.string(),
        locationId: uuidSchema,
      }),
    )
    .default([]),
});

export async function fetchBatchTrace(batchId: string) {
  const response = await authedFetch(`/api/v1/batches/${batchId}/trace`);
  if (!response.ok) throw new Error("Failed to load batch trace");
  return batchTraceSchema.parse(await response.json());
}

export function filterBatchesByExpiryHorizon(
  batches: BatchRecord[],
  horizonDays: number,
  asOf = new Date(),
): BatchRecord[] {
  const end = new Date(asOf);
  end.setUTCDate(end.getUTCDate() + horizonDays);
  return batches.filter((batch) => {
    if (!batch.expiresAt) return false;
    const expiry = new Date(batch.expiresAt);
    return expiry >= asOf && expiry <= end;
  });
}
