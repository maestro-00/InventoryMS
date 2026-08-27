import { Link } from "@tanstack/react-router";
import { useLocations } from "../../features/inventory/locations/api/location-queries";
import { useOpenShifts } from "../../features/registers/shifts/use-open-shifts";
import { useSession } from "../../shared/auth/session-context";
import { useActiveLocationId } from "../../shared/location/use-active-location";

export function ShiftStatusChip() {
  const { session } = useSession();
  const canSell = session?.permissions.includes("Sell") === true;
  const locations = useLocations();
  const locationId = useActiveLocationId();
  const { entries, isPending } = useOpenShifts({
    enabled: canSell && locationId !== "",
    locationId,
  });

  if (!canSell) return null;
  // useActiveLocationId is "" while locations are still loading — do not treat as "No location".
  if (locations.isPending) {
    return <span className="text-xs text-muted-foreground">Loading location…</span>;
  }
  if (locationId === "") {
    return <span className="text-xs text-muted-foreground">No location</span>;
  }
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
    <Link
      to="/pos"
      search={{ shiftId: entry.shift.id }}
      className="text-xs text-muted-foreground underline"
    >
      {entry.registerName} · open since{" "}
      {new Date(entry.shift.openedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </Link>
  );
}
