import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { useSession } from "../auth/session-context";
import { useLocations } from "../../features/inventory/locations/api/location-queries";
import {
  isPosLocationSwitchBlocked,
  subscribePosLocationGuard,
  setPosCartActive,
} from "../../features/pos/pos-location-guard-store";
import { clearLocationCaches } from "../api/client/query-scope";
import {
  getActiveLocationId,
  initializeActiveLocation,
  resolveActiveLocationId,
  setActiveLocationId,
  subscribeActiveLocation,
} from "./active-location-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

function locationInScope(locationId: string, locationScope: string[]): boolean {
  return locationScope.includes("*") || locationScope.includes(locationId);
}

export function useActiveLocationId(): string {
  const { session } = useSession();
  const locations = useLocations();
  // Re-render when the store changes; never return raw in-memory id without scope checks.
  useSyncExternalStore(
    subscribeActiveLocation,
    getActiveLocationId,
    getActiveLocationId,
  );

  const ids = (locations.data ?? []).map((location) => location.id);
  const tenantId = session?.tenantId ?? "";
  const locationScope = session?.locationScope ?? [];

  useEffect(() => {
    if (!tenantId || ids.length === 0) return;
    initializeActiveLocation({
      tenantId,
      locationScope,
      locationIds: ids,
    });
  }, [tenantId, ids.join(","), locationScope.join(",")]);

  if (!tenantId || ids.length === 0) return "";

  return resolveActiveLocationId({
    tenantId,
    locationScope,
    locationIds: ids,
  });
}

export function LocationSwitcher({
  onBlockedSwitch,
}: {
  onBlockedSwitch?: () => void;
} = {}) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const locations = useLocations();
  const activeLocationId = useActiveLocationId();
  const blocked = useSyncExternalStore(
    subscribePosLocationGuard,
    isPosLocationSwitchBlocked,
    isPosLocationSwitchBlocked,
  );
  const locationScope = session?.locationScope ?? [];
  const options = (locations.data ?? []).filter((location) =>
    locationInScope(location.id, locationScope),
  );
  const active =
    options.find((location) => location.id === activeLocationId) ?? options[0];

  if (options.length === 0) {
    return <span className="text-sm text-muted-foreground">No location</span>;
  }

  if (options.length === 1) {
    return (
      <span className="text-sm text-muted-foreground">{active?.name ?? "Location"}</span>
    );
  }

  return (
    <Select
      value={activeLocationId || active?.id || ""}
      onValueChange={(next) => {
        if (!session?.tenantId) return;
        if (!locationInScope(next, locationScope)) return;
        if (blocked) {
          const confirmed = window.confirm(
            "You have an active cart or a prepared till for offline sales. Switch location anyway? The current cart will be cleared.",
          );
          if (!confirmed) {
            onBlockedSwitch?.();
            return;
          }
          setPosCartActive(false);
        }
        const previous = activeLocationId;
        setActiveLocationId(session.tenantId, next);
        if (previous && previous !== next) {
          void clearLocationCaches(queryClient, previous);
        }
        void queryClient.invalidateQueries();
      }}
    >
      <SelectTrigger
        className="h-8 max-w-48 border-none bg-transparent px-1 shadow-none"
        aria-label="Switch location"
      >
        <SelectValue placeholder="Select location" />
      </SelectTrigger>
      <SelectContent>
        {options.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
