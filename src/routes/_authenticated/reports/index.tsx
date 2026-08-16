import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ReportFilters } from "../../../features/reports/filters/report-filters";
import { StandardReportTable } from "../../../features/reports/standard-reports/report-table";
import { ReportChart } from "../../../features/reports/charts/report-chart";
import { ReportExportPanel } from "../../../features/reports/exports/export-panel";
import { ReportSchedulesPanel } from "../../../features/reports/schedules/schedules-panel";
import {
  fetchReport,
  type ReportFilter,
  type ReportKind,
} from "../../../features/reports/api/reports-api";
import { fetchLocations } from "../../../features/inventory/locations/api/locations-api";

const KINDS: ReportKind[] = ["sales", "profit", "stock", "purchasing", "staff", "tax"];

type ReportsSearch = {
  kind?: ReportKind;
  from?: string;
  to?: string;
  locationId?: string;
};

export const Route = createFileRoute("/_authenticated/reports/")({
  validateSearch: (search: Record<string, unknown>): ReportsSearch => {
    const kind =
      typeof search.kind === "string" && KINDS.includes(search.kind as ReportKind)
        ? (search.kind as ReportKind)
        : "sales";
    const next: ReportsSearch = { kind };
    if (typeof search.from === "string") next.from = search.from;
    if (typeof search.to === "string") next.to = search.to;
    if (typeof search.locationId === "string") next.locationId = search.locationId;
    return next;
  },
  beforeLoad: ({ context }) => {
    const permissions = context.session?.permissions ?? [];
    if (!permissions.includes("ViewReports") && context.session?.role === "Cashier") {
      throw new Error("Reports require ViewReports");
    }
  },
  component: ReportsPage,
});

function ReportsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const session = Route.useRouteContext().session;
  const canViewProfit =
    Boolean(session?.permissions.includes("ViewProfit")) ||
    session?.role === "Owner" ||
    session?.role === "Administrator" ||
    session?.role === "Manager";

  const defaultFrom = useMemo(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 7);
    return date.toISOString();
  }, []);
  const defaultTo = useMemo(() => new Date().toISOString(), []);

  const kind = search.kind ?? "sales";
  const filter: ReportFilter = {
    from: search.from ?? defaultFrom,
    to: search.to ?? defaultTo,
    ...(search.locationId ? { locationId: search.locationId } : {}),
  };

  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchLocations(),
  });
  const report = useQuery({
    queryKey: ["report", kind, filter],
    queryFn: () => fetchReport(kind, filter),
  });

  const chartPoints =
    kind === "sales" && report.data
      ? (
          (report.data as { rows?: Array<{ occurredAt: string; total: string }> })
            .rows ?? []
        ).map((row) => ({
          label: row.occurredAt.slice(0, 10),
          value: Number(row.total),
        }))
      : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4">
      <h1>Reports</h1>
      <ReportFilters
        kind={kind}
        filter={filter}
        locations={(locations.data ?? []).map((location) => ({
          id: location.id,
          name: location.name,
        }))}
        onKindChange={(next) =>
          void navigate({
            search: (previous) => ({ ...previous, kind: next }),
          })
        }
        onFilterChange={(next) =>
          void navigate({
            search: {
              kind,
              from: next.from,
              to: next.to,
              ...(next.locationId ? { locationId: next.locationId } : {}),
            },
          })
        }
      />
      {report.isError ? <p role="alert">Failed to load report.</p> : null}
      {report.data ? (
        <>
          <StandardReportTable
            kind={kind}
            data={report.data}
            canViewProfit={canViewProfit}
          />
          {kind === "sales" ? <ReportChart points={chartPoints} /> : null}
          <ReportExportPanel kind={kind} filter={filter} />
        </>
      ) : null}
      <ReportSchedulesPanel />
    </main>
  );
}
