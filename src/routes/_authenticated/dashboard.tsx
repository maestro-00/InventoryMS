import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardContinuePanel } from "../../features/onboarding/dashboard-continue-panel";
import { fetchDashboard } from "../../features/reports/api/reports-api";
import { DashboardPanel } from "../../features/reports/dashboard/dashboard-metrics";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const session = Route.useRouteContext().session;
  const canViewProfit =
    Boolean(session?.permissions.includes("ViewProfit")) ||
    session?.role === "Owner" ||
    session?.role === "Administrator" ||
    session?.role === "Manager";
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
  });

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <DashboardContinuePanel />
      <p>
        Open <Link to="/reports">reports</Link> or{" "}
        <Link to="/notifications">notifications</Link>.
      </p>
      {dashboard.isError ? <p role="alert">Failed to load dashboard.</p> : null}
      {dashboard.data ? (
        <DashboardPanel data={dashboard.data} canViewProfit={canViewProfit} />
      ) : (
        <p>Loading metrics…</p>
      )}
    </section>
  );
}
