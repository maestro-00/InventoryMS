const STORAGE_PREFIX = "inventoryms:active-location:";

let activeLocationId = "";
let activeTenantId = "";
const listeners = new Set<() => void>();

function storageKey(tenantId: string): string {
  return `${STORAGE_PREFIX}${tenantId}`;
}

function readStored(tenantId: string): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(storageKey(tenantId)) ?? "";
}

function writeStored(tenantId: string, locationId: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (locationId) {
    sessionStorage.setItem(storageKey(tenantId), locationId);
  } else {
    sessionStorage.removeItem(storageKey(tenantId));
  }
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getActiveLocationId(): string {
  return activeLocationId;
}

export function subscribeActiveLocation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Pure resolver — no store writes or listener notifications. */
export function resolveActiveLocationId(input: {
  tenantId: string;
  locationScope: string[];
  locationIds: string[];
}): string {
  const scoped = input.locationIds.filter((id) =>
    input.locationScope.includes("*") ? true : input.locationScope.includes(id),
  );
  const stored =
    input.tenantId === activeTenantId ? activeLocationId : readStored(input.tenantId);
  return (
    (stored && scoped.includes(stored) ? stored : undefined) ??
    scoped[0] ??
    input.locationScope[0] ??
    ""
  );
}

/** Pick a valid location from scope + fetched list; restore tenant preference when possible. */
export function initializeActiveLocation(input: {
  tenantId: string;
  locationScope: string[];
  locationIds: string[];
}): string {
  const next = resolveActiveLocationId(input);
  if (input.tenantId === activeTenantId && next === activeLocationId) {
    return next;
  }
  activeTenantId = input.tenantId;
  activeLocationId = next;
  writeStored(input.tenantId, next);
  emit();
  return next;
}

export function setActiveLocationId(tenantId: string, locationId: string): void {
  activeTenantId = tenantId;
  activeLocationId = locationId;
  writeStored(tenantId, locationId);
  emit();
}

export function resetActiveLocation(): void {
  activeLocationId = "";
  activeTenantId = "";
  emit();
}
