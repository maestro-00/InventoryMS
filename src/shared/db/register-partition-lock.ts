import { openRegisterDatabase, partitionKey } from "./register-database";

/** Session-durable hint so a reload can lock the last prepared till without secrets. */
const REMEMBERED_PARTITION_KEY = "inventoryms:register-partition";

/**
 * Mark the offline partition locked: blocks new offline completions and sync upload
 * until PIN unlock + prepare clears the flag. Existing queued sales remain listable
 * for manager review and pending badges.
 */
export async function lockRegisterPartitionMeta(
  tenantId: string,
  registerId: string,
): Promise<void> {
  const db = openRegisterDatabase(tenantId, registerId);
  try {
    const key = partitionKey(tenantId, registerId);
    const existing = await db.meta.get(key);
    if (!existing || existing.locked) return;
    await db.meta.put({
      ...existing,
      locked: true,
    });
  } finally {
    db.close();
  }
}

export async function isRegisterPartitionLocked(
  tenantId: string,
  registerId: string,
): Promise<boolean> {
  const db = openRegisterDatabase(tenantId, registerId);
  try {
    const meta = await db.meta.get(partitionKey(tenantId, registerId));
    return Boolean(meta?.locked);
  } finally {
    db.close();
  }
}

/** Remember which till was unlocked so reload can fail-closed without in-memory crypto keys. */
export function rememberRegisterPartition(tenantId: string, registerId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      REMEMBERED_PARTITION_KEY,
      JSON.stringify({ tenantId, registerId }),
    );
  } catch {
    // Private mode / quota: sync still fails closed via missing register token.
  }
}

export function clearRememberedRegisterPartition(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(REMEMBERED_PARTITION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * After reload, in-memory register credentials are gone. Lock the last remembered
 * partition so queued sales cannot upload until PIN + prepareRegister again.
 */
export async function lockRememberedRegisterPartition(): Promise<void> {
  if (typeof sessionStorage === "undefined") return;
  let tenantId = "";
  let registerId = "";
  try {
    const raw = sessionStorage.getItem(REMEMBERED_PARTITION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { tenantId?: string; registerId?: string };
    tenantId = parsed.tenantId ?? "";
    registerId = parsed.registerId ?? "";
  } catch {
    return;
  }
  if (!tenantId || !registerId) return;
  await lockRegisterPartitionMeta(tenantId, registerId);
}
