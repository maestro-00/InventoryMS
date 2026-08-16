import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { completeOfflineSale, effectiveStockQuantity } from "./offline-sale-repository";
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

describe("offline sale repository", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
    await seedReady();
  });

  it("computes effective stock from overlays", () => {
    expect(
      effectiveStockQuantity("10.0000", [
        { qtyDelta: "-2.0000", active: true },
        { qtyDelta: "-1.0000", active: false },
      ]),
    ).toBe("8.0000");
  });

  it("atomically completes an offline sale with provisional receipt", async () => {
    const result = await completeOfflineSale({
      tenantId,
      registerId,
      shiftId,
      cart: {
        lines: [
          {
            productId,
            qty: "2",
            unitPrice: "10.00",
            taxComponentsJson: "[]",
            taxAmount: "0",
            lineTotal: "20.00",
            name: "Sugar",
          },
        ],
        payments: [{ tender: "Cash", amount: "20.00" }],
        subtotal: "20.00",
        discountTotal: "0",
        taxTotal: "0",
        grandTotal: "20.00",
      },
    });
    expect(result.receipt.label).toBe("Pending sync");
    const qrPayload = JSON.parse(result.receipt.qrPayload) as { type: string };
    expect(qrPayload.type).toBe("provisional");
    const db = openRegisterDatabase(tenantId, registerId);
    expect(await db.offlineSales.count()).toBe(1);
    expect(await db.overlays.count()).toBe(1);
    db.close();
  });
});
