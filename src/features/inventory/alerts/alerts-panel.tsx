import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { fetchAlerts } from "./api/alerts-api";

const FILTERS = [
  "All",
  "LowStock",
  "OutOfStock",
  "Expiry",
  "Overstock",
  "SlowMoving",
] as const;

export function AlertsPanel() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const alerts = useQuery({ queryKey: ["stock-alerts"], queryFn: fetchAlerts });

  const visible = useMemo(() => {
    const items = alerts.data ?? [];
    if (filter === "All") return items;
    return items.filter((alert) => alert.type === filter);
  }, [alerts.data, filter]);

  if (alerts.isPending) return <LoadingState label="Loading alerts" />;
  if (alerts.isError) return <ProblemSummary problem={toProblem(alerts.error)} />;

  return (
    <section className="flex flex-col gap-3" aria-label="Stock alerts">
      <label className="flex flex-col gap-1 text-sm">
        Alert type
        <select
          className="h-10 rounded-md border px-3"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as (typeof FILTERS)[number]);
          }}
        >
          {FILTERS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        Alert thresholds follow InventoryX rules and are read-only here.
      </p>
      <ul className="flex flex-col gap-2">
        {visible.map((alert) => (
          <li key={alert.id} className="rounded-md border p-3">
            <p className="font-medium">
              {alert.type}: {alert.title}
            </p>
            {alert.body ? (
              <p className="text-sm text-muted-foreground">{alert.body}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {visible.length === 0 ? <p>No open alerts for this filter.</p> : null}
    </section>
  );
}
