import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { AppShell } from "../app/providers/app-shell";
import { SubscriptionBanner } from "../app/providers/subscription-gate";
import { evaluateAccess } from "../shared/auth/access-policy";
import { useSession } from "../shared/auth/session-context";
import { useOnlineStatus } from "../shared/hooks/use-online-status";
import {
  getPendingSaleCount,
  subscribePendingSaleCount,
} from "../features/offline-sync/pending-sale-count-store";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    // A reload starts with no session in memory; wait for the cookie restore to settle
    // before deciding, so a valid session is never mistaken for an anonymous visitor.
    await context.sessionManager.whenRestored();
    const session = context.sessionManager.getSnapshot();
    const access = evaluateAccess({
      session,
      isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    });
    if (!access.allowed) {
      // TanStack Router uses thrown redirects as control flow.
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    // Child guards read the session this guard admitted rather than a rendered snapshot.
    return { session };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session } = useSession();
  const isOnline = useOnlineStatus();
  const pendingSaleCount = useSyncExternalStore(
    subscribePendingSaleCount,
    getPendingSaleCount,
    getPendingSaleCount,
  );
  return (
    <AppShell
      locationName="Select location"
      isOnline={isOnline}
      pendingSaleCount={pendingSaleCount}
      renderLink={(item, className) => (
        <Link to={item.to} className={className}>
          {item.label}
        </Link>
      )}
      navigation={[
        { to: "/dashboard", label: "Dashboard" },
        { to: "/onboarding", label: "Set up" },
        { to: "/reports", label: "Reports" },
        { to: "/notifications", label: "Notifications" },
        { to: "/staff", label: "Staff" },
        { to: "/settings/security", label: "Security" },
        { to: "/pos", label: "Point of sale" },
        { to: "/catalogue/products", label: "Catalogue" },
        { to: "/catalogue/categories", label: "Categories" },
        { to: "/locations", label: "Locations" },
        { to: "/inventory", label: "Inventory" },
        { to: "/inventory/batches", label: "Batches" },
        { to: "/registers", label: "Registers" },
        { to: "/purchasing", label: "Purchasing" },
        { to: "/inventory/opening-stock", label: "Opening stock" },
        { to: "/settings/business", label: "Business settings" },
        { to: "/settings/billing", label: "Billing" },
        { to: "/offline/review", label: "Offline review" },
        { to: "/settings/receipts", label: "Receipt template" },
      ].filter((item) => {
        if (!session) return false;
        if (item.to === "/pos") return session.permissions.includes("Sell");
        if (item.to === "/purchasing") {
          return (
            session.permissions.includes("ManagePurchasing") ||
            session.role === "Owner" ||
            session.role === "Administrator" ||
            session.role === "Manager"
          );
        }
        if (item.to === "/reports") {
          return (
            session.permissions.includes("ViewReports") ||
            session.role === "Owner" ||
            session.role === "Administrator" ||
            session.role === "Manager" ||
            session.role === "Accountant"
          );
        }
        if (item.to === "/staff") {
          return (
            session.permissions.includes("ManageUsers") ||
            session.role === "Owner" ||
            session.role === "Administrator"
          );
        }
        return true;
      })}
    >
      <SubscriptionBanner />
      <Outlet />
    </AppShell>
  );
}
