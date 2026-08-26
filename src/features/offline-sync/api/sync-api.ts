import { z } from "zod";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { expectSuccess, parseValue } from "../../../shared/api/client/api-result";
import { toApiNullish, uuidSchema } from "../../../shared/api/client/boundary-schema";

const rejectedOfflineSaleSchema = z.object({
  id: uuidSchema,
  clientSaleId: uuidSchema,
  registerId: uuidSchema,
  rejectionReason: z.string(),
  traceId: z.string().nullish(),
  status: z.string(),
  payloadHash: z.string(),
});

export type RejectedOfflineSale = z.infer<typeof rejectedOfflineSaleSchema>;

export async function fetchRejectedOfflineSales(): Promise<RejectedOfflineSale[]> {
  const outcome = await inventoryxClient.GET("/api/v1/sync/rejected");
  return parseValue(
    outcome,
    z.array(rejectedOfflineSaleSchema),
    "Rejected offline sales",
  );
}

export async function resolveRejectedOfflineSale(input: {
  rejectedSaleId: string;
  resolution: "retryRelease" | "reconcileLinked";
  linkedReconciliationSaleId?: string;
  note?: string;
}): Promise<void> {
  const outcome = await inventoryxClient.POST(
    "/api/v1/sync/rejected/{rejectedSaleId}/resolve",
    {
      params: { path: { rejectedSaleId: input.rejectedSaleId } },
      body: {
        resolution: input.resolution,
        linkedReconciliationSaleId: toApiNullish(input.linkedReconciliationSaleId),
        note: toApiNullish(input.note),
      },
    },
  );
  expectSuccess(outcome);
}

const conflictedSaleSchema = z.object({
  id: uuidSchema,
  clientSaleId: uuidSchema,
  stockConflictFlag: z.boolean().default(false),
  lines: z
    .array(
      z.object({
        productId: uuidSchema,
        qty: z.number().optional(),
      }),
    )
    .nullish()
    .transform((value) => value ?? []),
});

export type ConflictedSale = z.infer<typeof conflictedSaleSchema>;

export async function fetchSyncConflicts(): Promise<ConflictedSale[]> {
  const outcome = await inventoryxClient.GET("/api/v1/sync/conflicts");
  return parseValue(outcome, z.array(conflictedSaleSchema), "Sync conflicts");
}

export async function resolveSyncConflict(input: {
  saleId: string;
  resolution: "acceptAsIs" | "adjustWithReason";
  reasonCode?: string;
  adjustments?: Array<{ productId: string; qtyDelta: number }>;
}): Promise<void> {
  const outcome = await inventoryxClient.POST(
    "/api/v1/sync/conflicts/{saleId}/resolve",
    {
      params: { path: { saleId: input.saleId } },
      body: {
        resolution: input.resolution,
        reasonCode: toApiNullish(input.reasonCode),
        note: null,
        adjustments: input.adjustments ?? [],
      } as never,
    },
  );
  expectSuccess(outcome);
}
