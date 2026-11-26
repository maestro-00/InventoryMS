import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { useConfirmDialog } from "../ui/use-confirm-dialog";
import { useSession } from "../auth/session-context";
import { useLocations } from "../../features/inventory/locations/api/location-queries";
import {
  clearPosLocationGuard,
  isPosLocationSwitchBlocked,
  subscribePosLocationGuard,
} from "../../features/pos/pos-location-guard-store";
import { lockRegisterAuth } from "../auth/register-auth-store";
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
  const locationScope = session?.locationScope;
  const locationIdsKey = ids.join(",");
  const locationScopeKey = locationScope?.join(",") ?? "";

  useEffect(() => {
    if (!tenantId || ids.length === 0 || !locationScope) return;
    initializeActiveLocation({
      tenantId,
      locationScope,
      locationIds: ids,
    });
  }, [tenantId, locationIdsKey, locationScopeKey, ids, locationScope]);

  if (!tenantId || ids.length === 0 || !locationScope) return "";

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
  const { confirm, dialog } = useConfirmDialog();
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
      <span className="text-sm text-muted-foreground">
        {active?.name ?? "Location"}
      </span>
    );
  }

  function switchLocation(next: string) {
    if (!session?.tenantId) return;
    void lockRegisterAuth({ persistPartition: true });
    clearPosLocationGuard();
    const previous = activeLocationId;
    setActiveLocationId(session.tenantId, next);
    if (previous && previous !== next) {
      void clearLocationCaches(queryClient, previous);
    }
    void queryClient.invalidateQueries();
  }

  return (
    <>
      <Select
        value={activeLocationId || active?.id || ""}
        onValueChange={(next) => {
          if (!session?.tenantId) return;
          if (!locationInScope(next, locationScope)) return;
          if (blocked) {
            confirm({
              title: "Switch location?",
              description:
                "You have an active cart or a prepared till for offline sales. The current cart will be cleared and the till will lock.",
              actionLabel: "Switch location",
              onConfirm: () => {
                switchLocation(next);
              },
              onCancel: onBlockedSwitch,
            });
            return;
          }
          switchLocation(next);
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
      {dialog}
    </>
  );
}
