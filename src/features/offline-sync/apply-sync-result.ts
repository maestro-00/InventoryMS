import { fetchReceipt } from "../pos/receipts/api/receipts-api";
import { openRegisterDatabase } from "../../shared/db/register-database";
import { mergeProviderSnapshot } from "./prepare-register";
import type { IngestResult } from "./sync-coordinator";

export async function applySyncResult(input: {
  tenantId: string;
  registerId: string;
  clientSaleId: string;
  result: IngestResult;
  /** Defaults to a live provider snapshot merge when omitted. */
  mergeSnapshot?: () => Promise<{ watermark?: string | null } | undefined>;
  /** Defaults to GET /api/v1/sales/{id}/receipt when omitted. */
  fetchFinalReceipt?: (
    saleId: string,
  ) => Promise<{ id: string; number: string } | null>;
}): Promise<void> {
  const db = openRegisterDatabase(input.tenantId, input.registerId);
  try {
    const sale = await db.offlineSales.get(input.clientSaleId);
    if (!sale) throw new Error("Offline sale not found for sync result");

    if (input.result.status === "rejected") {
      await db.transaction("rw", db.offlineSales, db.overlays, async () => {
        await db.offlineSales.put({
          ...sale,
          status: "rejected",
          rejectionReason: input.result.error ?? "rejected",
          leaseExpiresAt: null,
        });
        // Overlays remain active until manager resolution — goods left the shelf.
      });
      return;
    }

    const status = input.result.status;
    const merge =
      input.mergeSnapshot ??
      (() =>
        mergeProviderSnapshot({
          tenantId: input.tenantId,
          registerId: input.registerId,
        }));
    const merged = await merge();
    const watermark =
      merged && typeof merged === "object" ? (merged.watermark ?? null) : null;

    let finalReceiptId: string | null = null;
    let finalReceiptNumber: string | null = null;
    const saleId = input.result.saleId ?? null;
    if (saleId) {
      const fetchFinal =
        input.fetchFinalReceipt ??
        (async (id: string) => {
          try {
            const receipt = await fetchReceipt(id);
            return { id: receipt.id, number: receipt.number };
          } catch {
            return null;
          }
        });
      const receipt = await fetchFinal(saleId);
      if (receipt) {
        finalReceiptId = receipt.id;
        finalReceiptNumber = receipt.number;
      }
    }

    await db.transaction("rw", db.offlineSales, db.overlays, async () => {
      await db.offlineSales.put({
        ...sale,
        status,
        serverSaleId: saleId,
        leaseExpiresAt: null,
        appliedSnapshotWatermark: watermark,
        finalReceiptId,
        finalReceiptNumber,
      });
      // Overlays retire only for a clean `applied` after the snapshot merge above.
      // `applied_with_conflict` keeps overlays visible until manager resolution.
      if (status === "applied") {
        const overlays = await db.overlays
          .where("clientSaleId")
          .equals(input.clientSaleId)
          .toArray();
        for (const overlay of overlays) {
          await db.overlays.put({ ...overlay, active: false });
        }
      }
    });
  } finally {
    db.close();
  }
}
