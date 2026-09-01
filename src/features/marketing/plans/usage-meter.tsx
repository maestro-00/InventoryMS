export function UsageMeter({
  label,
  used,
  total,
  unlimited = false,
}: {
  label: string;
  used: number;
  total?: number;
  unlimited?: boolean;
}) {
  if (unlimited || total == null) {
    return (
      <div className="min-w-[140px] flex-1">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-medium text-foreground">
            {used.toLocaleString()} / Unlimited
          </span>
        </div>
      </div>
    );
  }

  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const barColor =
    pct > 85 ? "bg-warning" : pct > 60 ? "bg-primary" : "bg-success";

  return (
    <div className="flex-1 min-w-[140px]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground">
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
