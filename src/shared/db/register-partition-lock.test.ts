import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  openRegisterDatabase,
  partitionKey,
  replaceSnapshotAtomically,
} from "./register-database";
import {
  isRegisterPartitionLocked,
  lockRegisterPartitionMeta,
  lockRememberedRegisterPartition,
  rememberRegisterPartition,
} from "./register-partition-lock";

const tenantId = "11111111-1111-4111-8111-111111111111";
const registerId = "22222222-2222-4222-8222-222222222222";

describe("register partition lock", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
    sessionStorage.clear();
  });

  it("marks an existing partition locked", async () => {
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
        bundleVersion: "1",
        preparedAt: new Date().toISOString(),
      },
      products: [],
      stock: [],
      taxes: [],
    });
    db.close();

    await lockRegisterPartitionMeta(tenantId, registerId);

    const locked = openRegisterDatabase(tenantId, registerId);
    const meta = await locked.meta.get(partitionKey(tenantId, registerId));
    expect(meta?.locked).toBe(true);
    locked.close();
    await expect(isRegisterPartitionLocked(tenantId, registerId)).resolves.toBe(true);
  });

  it("locks the remembered partition after a simulated reload", async () => {
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
        bundleVersion: "1",
        preparedAt: new Date().toISOString(),
      },
      products: [],
      stock: [],
      taxes: [],
    });
    db.close();

    rememberRegisterPartition(tenantId, registerId);
    await lockRememberedRegisterPartition();
    await expect(isRegisterPartitionLocked(tenantId, registerId)).resolves.toBe(true);
  });
});
