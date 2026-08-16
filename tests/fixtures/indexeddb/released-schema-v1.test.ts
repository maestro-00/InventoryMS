import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  openRegisterDatabase,
  REGISTER_DB_SCHEMA_VERSION,
  replaceSnapshotAtomically,
  type OfflineSaleRecord,
  type PartitionMeta,
  type SnapshotProduct,
  type SnapshotStock,
} from "../../../src/shared/db/register-database";
import { shouldDeferServiceWorkerUpdate } from "../../../src/shared/db/storage-pressure";

const fixture = JSON.parse(
  readFileSync("tests/fixtures/indexeddb/released-schema-v1.json", "utf8"),
) as {
  schemaVersion: number;
  tenantId: string;
  registerId: string;
  meta: PartitionMeta;
  products: SnapshotProduct[];
  stock: SnapshotStock[];
  taxes: [];
  offlineSales: OfflineSaleRecord[];
};

describe("released Dexie schema migration fixture", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(fixture.tenantId, fixture.registerId);
    await db.delete();
    db.close();
  });

  it("opens the current released schema version and restores the fixture partition", async () => {
    expect(fixture.schemaVersion).toBe(REGISTER_DB_SCHEMA_VERSION);
    const db = openRegisterDatabase(fixture.tenantId, fixture.registerId);
    expect(db.verno).toBe(REGISTER_DB_SCHEMA_VERSION);

    await replaceSnapshotAtomically(db, {
      meta: fixture.meta,
      products: fixture.products,
      stock: fixture.stock,
      taxes: fixture.taxes,
    });
    await db.offlineSales.bulkPut(fixture.offlineSales);

    expect(await db.products.count()).toBe(1);
    expect(await db.offlineSales.count()).toBe(1);
    const pending = await db.offlineSales.where("status").equals("pending").count();
    expect(pending).toBe(1);
    db.close();
  });

  it("defers mid-shift service-worker updates while a queue entry exists", () => {
    expect(
      shouldDeferServiceWorkerUpdate({
        hasActiveShift: true,
        pendingOfflineSales: 0,
      }),
    ).toBe(true);
    expect(
      shouldDeferServiceWorkerUpdate({
        hasActiveShift: false,
        pendingOfflineSales: fixture.offlineSales.length,
      }),
    ).toBe(true);
    expect(
      shouldDeferServiceWorkerUpdate({
        hasActiveShift: false,
        pendingOfflineSales: 0,
      }),
    ).toBe(false);
  });
});
