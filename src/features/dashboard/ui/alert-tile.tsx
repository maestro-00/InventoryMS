import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export function AlertTile({
  label,
  count,
  description,
  to,
  icon: Icon,
  tone = "warning",
}: {
  label: string;
  count: number;
  description: string;
  to: LinkProps["to"];
  icon: LucideIcon;
  tone?: "warning" | "destructive";
}) {
  if (count <= 0) return null;

  const toneClass =
    tone === "destructive"
      ? "border-destructive/20 bg-destructive/5 hover:border-destructive/40"
      : "border-warning/25 bg-warning/5 hover:border-warning/40";

  const iconClass =
    tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning";

  return (
    <Link
      to={to}
      className={cn(
        "app-surface-card flex min-h-touch items-start gap-3 p-4 transition-colors",
        toneClass,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconClass)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{count}</span>
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}
