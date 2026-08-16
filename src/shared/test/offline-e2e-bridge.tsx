import { useEffect } from "react";

export function isOfflineE2eBridgeEnabled(): boolean {
  return import.meta.env.VITE_E2E_OFFLINE_BRIDGE === "true";
}

/**
 * Lazily installs the Playwright offline harness so the production / MSW boot path
 * does not eagerly pull Dexie/sync modules into the critical path.
 */
export function OfflineE2eBridgeInstaller() {
  useEffect(() => {
    if (!isOfflineE2eBridgeEnabled()) return;
    void import("./offline-e2e-bridge-impl").then((module) => {
      module.installOfflineE2eBridge();
    });
  }, []);
  return null;
}
