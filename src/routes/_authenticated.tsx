import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { AppShell } from "../app/providers/app-shell";
import { SubscriptionBanner } from "../app/providers/subscription-gate";
import { buildNavigationGroups } from "../app/navigation/nav-config";
import { ShiftStatusChip } from "../app/navigation/shift-status-chip";
import { evaluateAccess } from "../shared/auth/access-policy";
import { useSession } from "../shared/auth/session-context";
import { useOnlineStatus } from "../shared/hooks/use-online-status";
import {
  getPendingSaleCount,
  subscribePendingSaleCount,
} from "../features/offline-sync/pending-sale-count-store";
import { LocationSwitcher } from "../shared/location/use-active-location";
import { useTenant } from "../features/tenant/api/tenant-queries";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    await context.sessionManager.whenRestored();
    const session = context.sessionManager.getSnapshot();
    const access = evaluateAccess({
      session,
      isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    });
    if (!access.allowed) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    return { session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session } = useSession();
  const tenant = useTenant();
  const isOnline = useOnlineStatus();
  const pendingSaleCount = useSyncExternalStore(
    subscribePendingSaleCount,
    getPendingSaleCount,
    getPendingSaleCount,
  );

  const navigationGroups = session
    ? buildNavigationGroups(session, tenant.data?.tenant.onboardingChecklist)
    : [];

  return (
    <AppShell
      isOnline={isOnline}
      pendingSaleCount={pendingSaleCount}
      navigationGroups={navigationGroups}
      locationControl={<LocationSwitcher />}
      shiftControl={<ShiftStatusChip />}
      renderLink={(item, className) => (
        <Link to={item.to} className={className}>
          {item.label}
        </Link>
      )}
    >
      <SubscriptionBanner />
      <Outlet />
    </AppShell>
  );
}
