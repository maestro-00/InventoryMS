import { Link } from "@tanstack/react-router";
import { useOpenShifts } from "../../features/registers/shifts/use-open-shifts";
import { useSession } from "../../shared/auth/session-context";

export function ShiftStatusChip() {
  const { session } = useSession();
  const canSell = session?.permissions.includes("Sell") === true;
  const { entries, isPending } = useOpenShifts({ enabled: canSell });

  if (!canSell) return null;
  if (isPending) {
    return <span className="text-xs text-muted-foreground">Loading shift…</span>;
  }
  if (entries.length === 0) {
    return (
      <Link to="/registers" className="text-xs underline">
        No open shift
      </Link>
    );
  }

  const entry = entries[0];
  if (!entry) return null;

  return (
    <Link to="/pos" className="text-xs text-muted-foreground underline">
      {entry.registerName} · open since{" "}
      {new Date(entry.shift.openedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </Link>
  );
}
