import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applySyncResult } from "./apply-sync-result";
import { completeOfflineSale } from "./offline-sale-repository";
import {
  openRegisterDatabase,
  partitionKey,
  replaceSnapshotAtomically,
} from "../../shared/db/register-database";

const tenantId = "11111111-1111-4111-8111-111111111111";
const registerId = "22222222-2222-4222-8222-222222222222";
const shiftId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";

async function seedReady() {
  const db = openRegisterDatabase(tenantId, registerId);
  await replaceSnapshotAtomically(db, {
    meta: {
      id: partitionKey(tenantId, registerId),
      tenantId,
      registerId,
      shiftId,
      locked: false,
      readinessDeadline: new Date(Date.now() + 3_600_000).toISOString(),
      watermark: "AAA=",
      bundleVersion: "2026.08.offline-prep.1",
      preparedAt: new Date().toISOString(),
    },
    products: [
      {
        id: productId,
        name: "Sugar",
        sku: "SUG",
        barcode: "6001",
        sellingPrice: "10.0000",
        taxTreatmentId: null,
        allowFractional: false,
        trackingMode: "Simple",
        allowsDiscount: true,
        version: "1",
      },
    ],
    stock: [
      {
        id: `${productId}::`,
        productId,
        variantId: null,
        batchId: null,
        qtyOnHand: "10.0000",
        qtyInTransit: "0.0000",
        qtyQuarantine: "0.0000",
        version: "1",
      },
    ],
    taxes: [],
  });
  db.close();
}

async function createPendingSale() {
  return completeOfflineSale({
    tenantId,
    registerId,
    shiftId,
    cart: {
      lines: [
        {
          productId,
          qty: "1",
          unitPrice: "10.00",
          taxComponentsJson: "[]",
          taxAmount: "0",
          lineTotal: "10.00",
          name: "Sugar",
        },
      ],
      payments: [{ tender: "Cash", amount: "10.00" }],
      subtotal: "10.00",
      discountTotal: "0",
      taxTotal: "0",
      grandTotal: "10.00",
    },
  });
}

describe("applySyncResult", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
    await seedReady();
  });

  it("rejects unknown client sale ids", async () => {
    await expect(
      applySyncResult({
        tenantId,
        registerId,
        clientSaleId: "99999999-9999-4999-8999-999999999999",
        result: { clientSaleId: "x", status: "applied" },
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("marks rejected sales without clearing overlays", async () => {
    const sale = await createPendingSale();
    await applySyncResult({
      tenantId,
      registerId,
      clientSaleId: sale.clientSaleId,
      result: {
        clientSaleId: sale.clientSaleId,
        status: "rejected",
        error: "sku missing",
      },
    });
    const db = openRegisterDatabase(tenantId, registerId);
    const row = await db.offlineSales.get(sale.clientSaleId);
    expect(row?.status).toBe("rejected");
    expect(row?.rejectionReason).toBe("sku missing");
    expect(await db.overlays.filter((overlay) => overlay.active).count()).toBe(1);
    db.close();
  });

  it("applies clean sync results and clears overlays", async () => {
    const sale = await createPendingSale();
    const mergeSnapshot = vi.fn(() => Promise.resolve({ watermark: "BBB=" }));
    const fetchFinalReceipt = vi.fn(() =>
      Promise.resolve({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", number: "R-42" }),
    );
    await applySyncResult({
      tenantId,
      registerId,
      clientSaleId: sale.clientSaleId,
      mergeSnapshot,
      fetchFinalReceipt,
      result: {
        clientSaleId: sale.clientSaleId,
        status: "applied",
        saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
    });
    expect(mergeSnapshot).toHaveBeenCalledOnce();
    expect(fetchFinalReceipt).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    const db = openRegisterDatabase(tenantId, registerId);
    const row = await db.offlineSales.get(sale.clientSaleId);
    expect(row?.status).toBe("applied");
    expect(row?.serverSaleId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(row?.finalReceiptNumber).toBe("R-42");
    expect(row?.appliedSnapshotWatermark).toBe("BBB=");
    expect(await db.overlays.filter((overlay) => overlay.active).count()).toBe(0);
    db.close();
  });

  it("keeps overlays active when applied with conflict", async () => {
    const sale = await createPendingSale();
    await applySyncResult({
      tenantId,
      registerId,
      clientSaleId: sale.clientSaleId,
      mergeSnapshot: () => Promise.resolve({ watermark: "CCC=" }),
      fetchFinalReceipt: () => Promise.resolve(null),
      result: {
        clientSaleId: sale.clientSaleId,
        status: "applied_with_conflict",
        saleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
    });
    const db = openRegisterDatabase(tenantId, registerId);
    const row = await db.offlineSales.get(sale.clientSaleId);
    expect(row?.status).toBe("applied_with_conflict");
    expect(row?.appliedSnapshotWatermark).toBe("CCC=");
    expect(await db.overlays.filter((overlay) => overlay.active).count()).toBe(1);
    db.close();
  });
});
