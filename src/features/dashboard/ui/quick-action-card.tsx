import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export function QuickActionCard({
  label,
  icon: Icon,
  to,
  className,
  tone = "primary",
}: {
  label: string;
  icon: LucideIcon;
  to: LinkProps["to"];
  className?: string;
  tone?: "primary" | "success" | "warning" | "muted";
}) {
  const chipTone = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <Link
      to={to}
      className={cn(
        "app-surface-card flex min-h-touch min-w-[9.5rem] shrink-0 flex-col gap-3 p-4 transition-all",
        "hover:border-primary/25 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <span
        className={cn("flex size-10 items-center justify-center rounded-lg", chipTone)}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}

export function QuickActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-4 md:overflow-visible">
      {children}
    </div>
  );
}
