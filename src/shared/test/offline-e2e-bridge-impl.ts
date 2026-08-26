import {
  prepareRegister,
  mergeProviderSnapshot,
} from "../../features/offline-sync/prepare-register";
import {
  completeOfflineSale,
  listPendingSales,
} from "../../features/offline-sync/offline-sale-repository";
import {
  runSyncBatch,
  toProviderIngestSale,
} from "../../features/offline-sync/sync-coordinator";
import { applySyncResult } from "../../features/offline-sync/apply-sync-result";
import { openRegisterDatabase, estimateStorage } from "../db/register-database";
import {
  lockRegisterPartition,
  canUnlockPartition,
  earliestDeadline,
} from "../auth/register-authorization";
import { unlockRegister } from "../auth/register-auth-store";
import { exchangeRegisterPin } from "../../features/auth/api/auth-api";
import {
  shouldDeferServiceWorkerUpdate,
  STORAGE_CLEANUP_ORDER,
} from "../db/storage-pressure";

export interface OfflineE2eBridge {
  prepareRegister: typeof prepareRegister;
  mergeProviderSnapshot: typeof mergeProviderSnapshot;
  completeOfflineSale: typeof completeOfflineSale;
  listPendingSales: typeof listPendingSales;
  runSyncBatch: typeof runSyncBatch;
  applySyncResult: typeof applySyncResult;
  toProviderIngestSale: typeof toProviderIngestSale;
  openRegisterDatabase: typeof openRegisterDatabase;
  estimateStorage: typeof estimateStorage;
  lockRegisterPartition: typeof lockRegisterPartition;
  canUnlockPartition: typeof canUnlockPartition;
  earliestDeadline: typeof earliestDeadline;
  unlockRegister: typeof unlockRegister;
  exchangeRegisterPin: typeof exchangeRegisterPin;
  shouldDeferServiceWorkerUpdate: typeof shouldDeferServiceWorkerUpdate;
  STORAGE_CLEANUP_ORDER: typeof STORAGE_CLEANUP_ORDER;
}

declare global {
  interface Window {
    __inventorymsOffline?: OfflineE2eBridge;
  }
}

export function installOfflineE2eBridge(): void {
  if (typeof window === "undefined") return;
  window.__inventorymsOffline = {
    prepareRegister,
    mergeProviderSnapshot,
    completeOfflineSale,
    listPendingSales,
    runSyncBatch,
    applySyncResult,
    toProviderIngestSale,
    openRegisterDatabase,
    estimateStorage,
    lockRegisterPartition,
    canUnlockPartition,
    earliestDeadline,
    unlockRegister,
    exchangeRegisterPin,
    shouldDeferServiceWorkerUpdate,
    STORAGE_CLEANUP_ORDER,
  };
}
