import { cn } from "@/shared/utils/cn";

export function LiveStatusBadge({
  isOnline,
  pendingSaleCount = 0,
  className,
  variant = "light",
}: {
  isOnline: boolean;
  pendingSaleCount?: number;
  className?: string;
  variant?: "light" | "dark";
}) {
  const online = isOnline && pendingSaleCount === 0;
  const syncing = isOnline && pendingSaleCount > 0;

  const label = !isOnline
    ? "Offline"
    : syncing
      ? `${String(pendingSaleCount)} pending sync`
      : "Live";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online && "bg-success/15 text-success",
        syncing && "bg-warning/15 text-warning",
        !isOnline && "bg-destructive/10 text-destructive",
        variant === "dark" && online && "bg-success/20 text-success",
        variant === "dark" && syncing && "bg-warning/20 text-warning",
        variant === "dark" && !isOnline && "bg-destructive/15 text-destructive",
        className,
      )}
      data-testid="live-status-badge"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          online && "animate-pulse bg-success",
          syncing && "bg-warning",
          !isOnline && "bg-destructive",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
