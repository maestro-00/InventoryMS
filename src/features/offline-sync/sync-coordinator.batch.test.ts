import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { runSyncBatch } from "./sync-coordinator";
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
      bundleVersion: "1",
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

describe("runSyncBatch", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
    await seedReady();
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
  });

  it("returns zero processed when nothing is pending", async () => {
    const result = await runSyncBatch({ tenantId, registerId });
    expect(result).toEqual({ processed: 0, stoppedForAuth: false });
  });

  it("uploads pending sales and applies results", async () => {
    const sale = await completeOfflineSale({
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

    const result = await runSyncBatch({
      tenantId,
      registerId,
      mergeSnapshot: () => Promise.resolve({ watermark: "post-apply" }),
      fetchFinalReceipt: () =>
        Promise.resolve({
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          number: "R-7",
        }),
      upload: () =>
        Promise.resolve([
          {
            clientSaleId: sale.clientSaleId,
            status: "applied" as const,
            saleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
        ]),
    });
    expect(result.processed).toBe(1);
    const db = openRegisterDatabase(tenantId, registerId);
    const row = await db.offlineSales.get(sale.clientSaleId);
    expect(row?.status).toBe("applied");
    expect(row?.finalReceiptNumber).toBe("R-7");
    expect(row?.appliedSnapshotWatermark).toBe("post-apply");
    db.close();
  });

  it("requeues sales when upload throws", async () => {
    const sale = await completeOfflineSale({
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
    const result = await runSyncBatch({
      tenantId,
      registerId,
      upload: () => {
        throw new Error("network down");
      },
    });
    expect(result).toEqual({ processed: 0, stoppedForAuth: false });
    const db = openRegisterDatabase(tenantId, registerId);
    expect((await db.offlineSales.get(sale.clientSaleId))?.status).toBe("pending");
    db.close();
  });
});
