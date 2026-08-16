import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  estimateStorage,
  openRegisterDatabase,
  partitionKey,
  REGISTER_DB_SCHEMA_VERSION,
  replaceSnapshotAtomically,
  requestPersistentStorage,
} from "./register-database";

const tenantId = "11111111-1111-4111-8111-111111111111";
const registerId = "22222222-2222-4222-8222-222222222222";

describe("register database", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
  });

  it("opens a versioned tenant/register partition", () => {
    const db = openRegisterDatabase(tenantId, registerId);
    expect(db.verno).toBe(REGISTER_DB_SCHEMA_VERSION);
    expect(partitionKey(tenantId, registerId)).toBe(`${tenantId}:${registerId}`);
    db.close();
  });

  it("replaces snapshot atomically and estimates storage", async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await replaceSnapshotAtomically(db, {
      meta: {
        id: partitionKey(tenantId, registerId),
        tenantId,
        registerId,
        shiftId: "33333333-3333-4333-8333-333333333333",
        locked: false,
        readinessDeadline: new Date(Date.now() + 60_000).toISOString(),
        watermark: "AAA=",
        bundleVersion: "2026.08.offline-prep.1",
        preparedAt: new Date().toISOString(),
      },
      products: [
        {
          id: "44444444-4444-4444-8444-444444444444",
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
          id: "44444444-4444-4444-8444-444444444444::",
          productId: "44444444-4444-4444-8444-444444444444",
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
    expect(await db.products.count()).toBe(1);
    await replaceSnapshotAtomically(db, {
      meta: {
        id: partitionKey(tenantId, registerId),
        tenantId,
        registerId,
        shiftId: "33333333-3333-4333-8333-333333333333",
        locked: false,
        readinessDeadline: new Date(Date.now() + 60_000).toISOString(),
        watermark: "BBB=",
        bundleVersion: "2026.08.offline-prep.1",
        preparedAt: new Date().toISOString(),
      },
      products: [],
      stock: [],
      taxes: [],
    });
    expect(await db.products.count()).toBe(0);
    const estimate = await estimateStorage();
    expect(estimate.quota).toBeGreaterThan(0);
    await expect(requestPersistentStorage()).resolves.toBeTypeOf("boolean");
    db.close();
  });
});
