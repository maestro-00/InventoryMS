import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronRight } from "lucide-react";
import { LiveStatusBadge } from "../../features/dashboard/ui/live-status-badge";
import { fetchDashboard } from "../../features/reports/api/reports-api";
import {
  DashboardMetricsSkeleton,
  DashboardPanel,
} from "../../features/reports/dashboard/dashboard-metrics";
import { useSession } from "../../shared/auth/session-context";
import { useOnlineStatus } from "../../shared/hooks/use-online-status";
import { useLocations } from "../../features/inventory/locations/api/location-queries";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import {
  getPendingSaleCount,
  subscribePendingSaleCount,
} from "../../features/offline-sync/pending-sale-count-store";
import { useSyncExternalStore } from "react";
import { Button } from "../../shared/ui/button";
import { cn } from "../../shared/utils/cn";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const session = Route.useRouteContext().session;
  const { session: liveSession } = useSession();
  const isOnline = useOnlineStatus();
  const pendingSaleCount = useSyncExternalStore(
    subscribePendingSaleCount,
    getPendingSaleCount,
    getPendingSaleCount,
  );
  const activeLocationId = useActiveLocationId();
  const locations = useLocations();

  const canViewProfit =
    Boolean(session?.permissions.includes("ViewProfit")) ||
    session?.role === "Owner" ||
    session?.role === "Administrator" ||
    session?.role === "Manager";
  const canSell = liveSession?.permissions.includes("Sell") === true;
  const canManageStock =
    liveSession?.permissions.includes("ManageStock") === true ||
    ["Owner", "Administrator", "Admin", "Manager"].includes(liveSession?.role ?? "");
  const canViewReports =
    liveSession?.permissions.includes("ViewReports") === true ||
    ["Owner", "Administrator", "Admin", "Manager", "Accountant"].includes(
      liveSession?.role ?? "",
    );

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const locationName =
    locations.data?.find((location) => location.id === activeLocationId)?.name ??
    "All locations";
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header
        className={cn(
          "marketing-animate-in relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 sm:p-6",
        )}
      >
        <div
          className="marketing-grid-light pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Operations hub
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {todayLabel} · {locationName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveStatusBadge
              isOnline={isOnline}
              pendingSaleCount={pendingSaleCount}
              className="sm:hidden"
            />
            <Button variant="outline" size="sm" asChild className="min-h-touch">
              <Link to="/reports">
                Reports
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="min-h-touch">
              <Link to="/notifications">
                <Bell className="size-4" aria-hidden />
                Notifications
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {dashboard.isError ? (
        <div role="alert" className="app-surface-card rounded-xl p-5">
          <p className="font-medium text-foreground">
            Failed to load dashboard metrics.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              void dashboard.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {dashboard.isPending ? <DashboardMetricsSkeleton /> : null}

      {dashboard.data ? (
        <div className="marketing-animate-in marketing-delay-2">
          <DashboardPanel
            data={dashboard.data}
            canViewProfit={canViewProfit}
            canSell={canSell}
            canManageStock={canManageStock}
            canViewReports={canViewReports}
          />
        </div>
      ) : null}
    </section>
  );
}
