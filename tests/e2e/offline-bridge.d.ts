import type { OfflineE2eBridge } from "../../src/shared/test/offline-e2e-bridge-impl";

declare global {
  interface Window {
    __inventorymsOffline?: OfflineE2eBridge;
  }
}

export {};
