export type SyncChannelMessage =
  { type: "status"; leader: boolean; pending: number } | { type: "request-leadership" };

export function syncLockName(tenantId: string, registerId: string): string {
  return `inventoryms-sync:${tenantId}:${registerId}`;
}

export function syncChannelName(tenantId: string, registerId: string): string {
  return `inventoryms-sync-bus:${tenantId}:${registerId}`;
}

export async function withSyncLeadership<T>(
  tenantId: string,
  registerId: string,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T | null> {
  const locksApi = (navigator as unknown as { locks?: LockManager }).locks;
  if (!locksApi) {
    return work(new AbortController().signal);
  }
  return locksApi.request(
    syncLockName(tenantId, registerId),
    { ifAvailable: true },
    async (lock) => {
      if (!lock) return null;
      const controller = new AbortController();
      try {
        return await work(controller.signal);
      } finally {
        controller.abort();
      }
    },
  );
}

export function publishSyncStatus(
  tenantId: string,
  registerId: string,
  message: SyncChannelMessage,
): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(syncChannelName(tenantId, registerId));
  channel.postMessage(message);
  channel.close();
}
