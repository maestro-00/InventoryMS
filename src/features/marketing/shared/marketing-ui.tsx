import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { LiveStatusBadge } from "@/features/dashboard/ui/live-status-badge";
import { StatCard } from "@/features/dashboard/ui/stat-card";

export function MarketingAtmosphere({
  children,
  className,
  variant = "navy",
}: {
  children: ReactNode;
  className?: string;
  variant?: "navy" | "light";
}) {
  return (
    <div
      className={cn(
        "marketing-surface relative overflow-hidden",
        variant === "navy" ? "bg-navy text-navy-foreground" : "bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          variant === "navy" ? "marketing-grid-navy" : "marketing-grid-light",
        )}
        aria-hidden
      />
      {variant === "navy" ? (
        <>
          <div
            className="pointer-events-none absolute -left-1/4 top-0 size-[600px] rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-1/4 bottom-0 size-[500px] rounded-full bg-success/5 blur-3xl"
            aria-hidden
          />
        </>
      ) : null}
      <div
        className="marketing-grain pointer-events-none absolute inset-0"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function MarketingEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "marketing-animate-in mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      {children}
    </p>
  );
}

export function MarketingDisplayHeading({
  children,
  className,
  as: Tag = "h1",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "marketing-animate-in marketing-delay-1 font-sans font-bold leading-tight tracking-tight",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function DashboardPreview() {
  const metrics = [
    { label: "Today's sales", value: "GHS 4,280", delta: "+12%" },
    { label: "Low stock", value: "12 items", delta: "3 urgent" },
    { label: "Open shifts", value: "3", delta: "Accra · Tema" },
    { label: "Locations", value: "4", delta: "All synced" },
  ];

  const bars = [42, 68, 55, 82, 61, 74, 48, 88];

  return (
    <div className="marketing-animate-in marketing-delay-3 relative w-full flex-1">
      <div
        className="pointer-events-none absolute -inset-4 rounded-2xl bg-primary/20 blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-xl border border-navy-light/80 bg-navy-light/50 p-1 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-1.5 border-b border-navy-light/60 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/80" aria-hidden />
          <span className="size-2.5 rounded-full bg-warning/80" aria-hidden />
          <span className="size-2.5 rounded-full bg-success/80" aria-hidden />
          <span className="ml-2 text-xs text-navy-foreground/50">inventoryms.app</span>
        </div>
        <div className="rounded-lg border border-border/50 bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Operations hub</p>
              <p className="text-xs text-muted-foreground">Tuesday · Accra HQ</p>
            </div>
            <LiveStatusBadge isOnline pendingSaleCount={0} />
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {metrics.map((metric) => (
              <StatCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                delta={metric.delta}
                trend="up"
                compact
              />
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-muted/80 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Weekly sales</span>
              <span className="font-medium text-foreground">GHS 28.4k</span>
            </div>
            <div className="flex h-20 items-end gap-1">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary"
                  style={{ height: `${String(h)}%` }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LogoMarquee({ logos }: { logos: readonly string[] }) {
  const doubled = [...logos, ...logos];

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-navy to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-navy to-transparent"
        aria-hidden
      />
      <div className="marketing-marquee flex w-max gap-10 md:gap-16">
        {doubled.map((logo, index) => (
          <span
            key={`${logo}-${String(index)}`}
            className="shrink-0 text-sm font-semibold tracking-tight text-navy-foreground/35"
          >
            {logo}
          </span>
        ))}
      </div>
    </div>
  );
}

const FEATURE_PREVIEW_COPY: Record<
  string,
  { title: string; rows: { label: string; value: string }[] }
> = {
  pos: {
    title: "Counter · Register 2",
    rows: [
      { label: "Rice 5kg", value: "GHS 45.00" },
      { label: "Palm oil 1L", value: "GHS 18.50" },
      { label: "Total", value: "GHS 63.50" },
    ],
  },
  inventory: {
    title: "Stock · Makola branch",
    rows: [
      { label: "SKU-1042", value: "142 units" },
      { label: "SKU-2088", value: "8 units ⚠" },
      { label: "Last sync", value: "2 min ago" },
    ],
  },
  purchasing: {
    title: "PO #1048 · Pending",
    rows: [
      { label: "Supplier", value: "NorthGrid" },
      { label: "Items", value: "24 lines" },
      { label: "Expected", value: "Thu 14:00" },
    ],
  },
  reports: {
    title: "Profit · This week",
    rows: [
      { label: "Revenue", value: "GHS 28.4k" },
      { label: "Margin", value: "34.2%" },
      { label: "Top SKU", value: "Rice 5kg" },
    ],
  },
  offline: {
    title: "Sync queue",
    rows: [
      { label: "Queued sales", value: "7" },
      { label: "Last online", value: "09:14" },
      { label: "Status", value: "Syncing…" },
    ],
  },
  staff: {
    title: "Team · Accra HQ",
    rows: [
      { label: "Owner", value: "Ama K." },
      { label: "Cashiers", value: "4 active" },
      { label: "Pending invites", value: "1" },
    ],
  },
};

export function FeaturePreview({ sectionId }: { sectionId: string }) {
  const preview = FEATURE_PREVIEW_COPY[sectionId] ?? {
    title: "Preview",
    rows: [{ label: "—", value: "—" }],
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/50 p-1 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="size-2 rounded-full bg-primary/60" aria-hidden />
        <span className="text-xs font-medium text-muted-foreground">
          {preview.title}
        </span>
      </div>
      <div className="space-y-0 divide-y divide-border/60 p-4">
        {preview.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
