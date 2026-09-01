import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export type StatTrend = "up" | "down" | "flat";

export function formatMetricDelta(
  today: string | number,
  prior: string | number,
): {
  label: string;
  trend: StatTrend;
} {
  const delta = Number(today) - Number(prior);
  const sign = delta > 0 ? "+" : "";
  const trend: StatTrend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    label: `${sign}${delta.toFixed(2)} vs last week`,
    trend,
  };
}

function TrendIcon({ trend }: { trend: StatTrend }) {
  if (trend === "up") return <ArrowUpRight className="size-3.5" aria-hidden />;
  if (trend === "down") return <ArrowDownRight className="size-3.5" aria-hidden />;
  return <Minus className="size-3.5" aria-hidden />;
}

export function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  to,
  search,
  className,
  compact = false,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: StatTrend;
  to?: LinkProps["to"];
  search?: LinkProps["search"];
  className?: string;
  compact?: boolean;
}) {
  const content = (
    <>
      <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-semibold text-foreground",
          compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl",
        )}
      >
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-0.5 font-medium",
            compact ? "text-[10px]" : "text-xs",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            trend === "flat" && "text-muted-foreground",
          )}
        >
          <TrendIcon trend={trend} />
          {delta}
        </p>
      ) : null}
    </>
  );

  const shellClass = cn(
    "block rounded-xl border border-border/60 bg-card p-4 transition-colors",
    "hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );

  if (to) {
    return (
      <Link to={to} search={search} className={shellClass}>
        {content}
      </Link>
    );
  }

  return <div className={shellClass}>{content}</div>;
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-xl border border-border/60 bg-card p-4", className)}
      aria-hidden
    >
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-7 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function StatCardGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">{children}</ul>;
}
