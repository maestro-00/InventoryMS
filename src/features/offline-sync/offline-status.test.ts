import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { loadOfflineStatus } from "./offline-status";
import {
  openRegisterDatabase,
  partitionKey,
  replaceSnapshotAtomically,
} from "../../shared/db/register-database";
import { completeOfflineSale } from "./offline-sale-repository";

const tenantId = "11111111-1111-4111-8111-111111111111";
const registerId = "22222222-2222-4222-8222-222222222222";
const shiftId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";

describe("offline status", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
    const seeded = openRegisterDatabase(tenantId, registerId);
    await replaceSnapshotAtomically(seeded, {
      meta: {
        id: partitionKey(tenantId, registerId),
        tenantId,
        registerId,
        shiftId,
        locked: false,
        readinessDeadline: new Date(Date.now() + 60_000).toISOString(),
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
    seeded.close();
  });

  it("reports pending sales and deadline state", async () => {
    await completeOfflineSale({
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
    const withDeadline = await loadOfflineStatus({
      tenantId,
      registerId,
      hasActiveShift: true,
      deadline: new Date(Date.now() + 60_000).toISOString(),
      liveOnlyDisabled: false,
    });
    expect(withDeadline.pendingCount).toBe(1);
    expect(withDeadline.deadlinePassed).toBe(false);
    expect(withDeadline.liveOnlyDisabled).toBe(false);

    const past = await loadOfflineStatus({
      tenantId,
      registerId,
      hasActiveShift: false,
      deadline: "2000-01-01T00:00:00.000Z",
    });
    expect(past.deadlinePassed).toBe(true);
    expect(past.liveOnlyDisabled).toBe(true);
  });
});
