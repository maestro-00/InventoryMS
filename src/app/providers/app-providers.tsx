import { useQueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";
import { SessionProvider, useSession } from "../../shared/auth/session-context";
import type { SessionManager } from "../../shared/auth/session-manager";
import { lockRegisterAuth } from "../../shared/auth/register-auth-store";
import { lockRememberedRegisterPartition } from "../../shared/db/register-partition-lock";
import { resetActiveLocation } from "../../shared/location/active-location-store";
import { clearPosLocationGuard } from "../../features/pos/pos-location-guard-store";
import { TooltipProvider } from "../../shared/ui/tooltip";
import { PwaProvider } from "./pwa-provider";
import { AppQueryProvider } from "./query-provider";
import { TelemetryProvider } from "./telemetry-provider";
import { SubscriptionGateProvider } from "./subscription-gate";
import { OfflineE2eBridgeInstaller } from "../../shared/test/offline-e2e-bridge";
import { createAppRouter } from "../router";

function GlobalAnnouncer() {
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" id="app-announcer" />
  );
}

function QueryScopeTeardown() {
  const client = useQueryClient();
  const { manager } = useSession();
  useEffect(() => {
    return manager.subscribe((event) => {
      if (event.lockRegister) {
        void lockRegisterAuth({ persistPartition: true });
        clearPosLocationGuard();
      }
      if (event.type === "restore") {
        // Reload drops in-memory register credentials; fail closed for upload until PIN.
        void lockRememberedRegisterPartition();
        clearPosLocationGuard();
      }
      if (event.clearCache) {
        resetActiveLocation();
        void client.cancelQueries();
        client.removeQueries();
      }
    });
  }, [client, manager]);
  return null;
}

function RoutedApp() {
  const { session, manager } = useSession();
  // One router instance for the life of the app: recreating it on every session change
  // would throw away the current location. Signing in or out re-runs the guards through
  // an invalidation with the fresh context instead.
  const router = useMemo(
    () => createAppRouter({ session: null, sessionManager: manager }),
    [manager],
  );

  useEffect(() => {
    void router.invalidate();
  }, [router, session]);

  return (
    <RouterProvider router={router} context={{ session, sessionManager: manager }} />
  );
}

export function AppProviders({
  children,
  manager,
}: {
  children?: ReactNode;
  /** Tests inject a manager so each case starts from a known session lifecycle. */
  manager?: SessionManager;
}) {
  return (
    <TelemetryProvider>
      <SessionProvider {...(manager ? { manager } : {})}>
        <AppQueryProvider>
          <QueryScopeTeardown />
          <PwaProvider>
            <SubscriptionGateProvider>
              <TooltipProvider>
                <OfflineE2eBridgeInstaller />
                <GlobalAnnouncer />
                {children ?? <RoutedApp />}
              </TooltipProvider>
            </SubscriptionGateProvider>
          </PwaProvider>
        </AppQueryProvider>
      </SessionProvider>
    </TelemetryProvider>
  );
}
