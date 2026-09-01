import { lazy, Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { cn } from "../../../shared/utils/cn";
import { Button } from "../../../shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Skeleton } from "../../../shared/ui/skeleton";
import { useDashboardSalesTrend } from "../hooks/use-dashboard-sales-trend";

const SalesChartLazy = lazy(async () => {
  const { SalesTrendChart } = await import("../../reports/charts/sales-trend-chart");
  return { default: SalesTrendChart };
});

function ComparisonBars({
  today,
  prior,
}: {
  today: number;
  prior: number;
}) {
  const max = Math.max(today, prior, 1);
  return (
    <div className="space-y-3" role="img" aria-label="Today versus same day last week">
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Today</span>
          <span className="font-medium text-foreground">{formatGhanaMoney(String(today))}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
            style={{ width: `${String((today / max) * 100)}%` }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Same day last week</span>
          <span className="font-medium text-foreground">{formatGhanaMoney(String(prior))}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/50"
            style={{ width: `${String((prior / max) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ points }: { points: Array<{ label: string; value: number }> }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="flex h-28 items-end gap-1.5 sm:h-32" role="img" aria-label="Sales trend">
      {points.map((point) => (
        <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-sm bg-gradient-to-t from-primary/40 to-primary transition-all"
            style={{ height: `${String(Math.max((point.value / max) * 100, 4))}%` }}
            title={`${point.label}: ${formatGhanaMoney(String(point.value))}`}
          />
          <span className="text-[10px] text-muted-foreground">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardSalesPanel({
  todaySales,
  priorSales,
}: {
  todaySales: string;
  priorSales: string;
}) {
  const [range, setRange] = useState<"daily" | "weekly">("weekly");
  const trend = useDashboardSalesTrend(range);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Sales trend</CardTitle>
          <p className="text-xs text-muted-foreground">
            {range === "weekly" ? "Last 7 days" : "Today"}
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5"
          role="tablist"
          aria-label="Sales trend range"
        >
          {(["daily", "weekly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={range === option}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors min-h-touch sm:min-h-0",
                range === option
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setRange(option);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {trend.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : trend.isError || trend.data.points.every((p) => p.value === 0) ? (
          <ComparisonBars today={Number(todaySales)} prior={Number(priorSales)} />
        ) : trend.data.points.length <= 1 ? (
          <MiniBarChart points={trend.data.points} />
        ) : (
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <div className="[&_.recharts-bar-rectangle]:fill-primary">
              <SalesChartLazy points={trend.data.points} />
            </div>
          </Suspense>
        )}
        {!trend.isPending && !trend.isError && trend.data.total > 0 ? (
          <p className="mt-3 text-right text-sm font-medium text-foreground">
            Total {formatGhanaMoney(String(trend.data.total))}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" asChild className="px-0 text-primary hover:text-primary">
          <Link to="/reports" search={{ kind: "sales" }}>
            View full report
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
