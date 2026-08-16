export type StorageCleanupStep =
  "telemetry" | "expired-exports" | "stale-search-index" | "never-queue";

/** Cleanup order under storage pressure. Financial queue records are never auto-deleted. */
export const STORAGE_CLEANUP_ORDER: StorageCleanupStep[] = [
  "telemetry",
  "expired-exports",
  "stale-search-index",
  "never-queue",
];

export function shouldBlockOfflineCompletion(input: {
  usage: number;
  quota: number;
  estimatedSaleBytes: number;
}): boolean {
  if (!Number.isFinite(input.quota) || input.quota <= 0) return false;
  return input.usage + input.estimatedSaleBytes > input.quota * 0.95;
}

export function shouldDeferServiceWorkerUpdate(input: {
  hasActiveShift: boolean;
  pendingOfflineSales: number;
}): boolean {
  return input.hasActiveShift || input.pendingOfflineSales > 0;
}
