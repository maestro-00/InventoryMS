import { inventoryxClient } from "../../shared/api/client/inventoryx-client";
import { getRegisterAccessToken } from "../../shared/auth/register-auth-store";
import {
  isRegisterPartitionLocked,
  lockRegisterPartitionMeta,
} from "../../shared/db/register-partition-lock";
import { listPendingSales, updateSaleStatus } from "./offline-sale-repository";
import { publishSyncStatus, withSyncLeadership } from "./sync-leader";
import { applySyncResult } from "./apply-sync-result";
import { mergeProviderSnapshot } from "./prepare-register";
import { fetchReceipt } from "../pos/receipts/api/receipts-api";

export type IngestStatus = "applied" | "applied_with_conflict" | "rejected";

export interface IngestResult {
  clientSaleId: string;
  saleId?: string | null;
  status: IngestStatus;
  error?: string | null;
}

const MAX_BATCH = 25;

export function classifySyncFailure(status: number): "auth" | "retry" | "stop" {
  if (status === 401 || status === 403) return "auth";
  if (status === 429 || status >= 500) return "retry";
  return "stop";
}

export function nextBackoffMs(attempt: number, retryAfterSeconds?: number): number {
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  const base = Math.min(30_000, 500 * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(Math.random() * 250);
  return base + jitter;
}

interface LocalOfflinePayload {
  clientSaleId: string;
  registerId: string;
  shiftId: string;
  occurredAt: string;
  lines: Array<{
    productId: string;
    variantId?: string | null;
    batchId?: string | null;
    qty: string;
    unitPrice: string;
    lineDiscount?: string;
    taxComponentsJson: string;
    fiscalEvidenceHash?: string;
    discountAuthorizedBy?: string;
    note?: string;
  }>;
  payments: Array<{ tender: string; amount: string; reference?: string }>;
}

/**
 * Map the immutable local offline envelope onto InventoryX CreateSaleCommand,
 * including historical fiscal evidence the provider requires for offline ingest.
 */
export function toProviderIngestSale(
  payload: LocalOfflinePayload,
  payloadHash: string,
): Record<string, unknown> {
  return {
    clientSaleId: payload.clientSaleId,
    registerId: payload.registerId,
    shiftId: payload.shiftId,
    occurredAt: payload.occurredAt,
    offlineOrigin: true,
    acceptHistoricalFiscalSnapshot: true,
    allowNegativeStock: true,
    lines: payload.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId ?? null,
      batchId: line.batchId ?? null,
      qty: Number(line.qty),
      unitPrice: Number(line.unitPrice),
      lineDiscount: Number(line.lineDiscount ?? 0),
      taxComponentsJson: line.taxComponentsJson,
      fiscalEvidenceHash: line.fiscalEvidenceHash ?? payloadHash,
      ...(line.discountAuthorizedBy
        ? { discountAuthorizedBy: line.discountAuthorizedBy }
        : {}),
      ...(line.note ? { note: line.note } : {}),
    })),
    payments: payload.payments.map((payment) => ({
      tender: payment.tender,
      amount: Number(payment.amount),
      ...(payment.reference ? { reference: payment.reference } : {}),
    })),
  };
}

function parseIngestResults(data: unknown): IngestResult[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const item = row as Record<string, unknown>;
    const rawStatus = item.status;
    const status = typeof rawStatus === "string" ? rawStatus : "";
    if (
      status !== "applied" &&
      status !== "applied_with_conflict" &&
      status !== "rejected"
    ) {
      throw new Error(`Unexpected offline ingest status: ${status || "(empty)"}`);
    }
    return {
      clientSaleId: String(item.clientSaleId),
      saleId: (item.saleId as string | null | undefined) ?? null,
      status,
      error: (item.error as string | null | undefined) ?? null,
    };
  });
}

export async function runSyncBatch(input: {
  tenantId: string;
  registerId: string;
  upload?: (sales: unknown[]) => Promise<IngestResult[]>;
  mergeSnapshot?: () => Promise<{ watermark?: string | null } | undefined>;
  fetchFinalReceipt?: (
    saleId: string,
  ) => Promise<{ id: string; number: string } | null>;
}): Promise<{ processed: number; stoppedForAuth: boolean }> {
  return (
    (await withSyncLeadership(input.tenantId, input.registerId, async () => {
      const pending = await listPendingSales(input.tenantId, input.registerId);
      const batch = pending
        .filter((sale) => sale.status === "pending")
        .slice(0, MAX_BATCH);
      publishSyncStatus(input.tenantId, input.registerId, {
        type: "status",
        leader: true,
        pending: pending.length,
      });
      if (batch.length === 0) return { processed: 0, stoppedForAuth: false };
      // Locked partition or missing register token: keep queue visible, require PIN/prepare.
      if (await isRegisterPartitionLocked(input.tenantId, input.registerId)) {
        return { processed: 0, stoppedForAuth: true };
      }
      if (!input.upload) {
        const registerToken = await getRegisterAccessToken({
          registerId: input.registerId,
        });
        if (!registerToken) {
          await lockRegisterPartitionMeta(input.tenantId, input.registerId);
          return { processed: 0, stoppedForAuth: true };
        }
      }

      const leaseExpiresAt = new Date(Date.now() + 60_000).toISOString();
      for (const sale of batch) {
        await updateSaleStatus(input.tenantId, input.registerId, sale.clientSaleId, {
          status: "syncing",
          leaseExpiresAt,
        });
      }

      const payload = batch.map((sale) =>
        toProviderIngestSale(
          JSON.parse(sale.payloadJson) as LocalOfflinePayload,
          sale.payloadHash,
        ),
      );
      let results: IngestResult[];
      try {
        if (input.upload) {
          results = await input.upload(payload);
        } else {
          const { data, response } = await inventoryxClient.POST("/api/v1/sync/sales", {
            body: { sales: payload } as never,
          });
          if (!response.ok) {
            const kind = classifySyncFailure(response.status);
            for (const sale of batch) {
              await updateSaleStatus(
                input.tenantId,
                input.registerId,
                sale.clientSaleId,
                { status: "pending", leaseExpiresAt: null },
              );
            }
            return { processed: 0, stoppedForAuth: kind === "auth" };
          }
          results = parseIngestResults(data);
        }
      } catch {
        for (const sale of batch) {
          await updateSaleStatus(input.tenantId, input.registerId, sale.clientSaleId, {
            status: "pending",
            leaseExpiresAt: null,
          });
        }
        return { processed: 0, stoppedForAuth: false };
      }

      const mergeSnapshot =
        input.mergeSnapshot ??
        (() =>
          mergeProviderSnapshot({
            tenantId: input.tenantId,
            registerId: input.registerId,
          }));
      const fetchFinalReceipt =
        input.fetchFinalReceipt ??
        (async (saleId: string) => {
          try {
            const receipt = await fetchReceipt(saleId);
            return { id: receipt.id, number: receipt.number };
          } catch {
            return null;
          }
        });

      for (const sale of batch) {
        const result = results.find((row) => row.clientSaleId === sale.clientSaleId);
        if (!result) {
          throw new Error("Sync result missing clientSaleId identity");
        }
        await applySyncResult({
          tenantId: input.tenantId,
          registerId: input.registerId,
          clientSaleId: sale.clientSaleId,
          result,
          mergeSnapshot:
            result.status === "rejected"
              ? () => Promise.resolve(undefined)
              : mergeSnapshot,
          fetchFinalReceipt,
        });
      }

      return { processed: batch.length, stoppedForAuth: false };
    })) ?? { processed: 0, stoppedForAuth: false }
  );
}
