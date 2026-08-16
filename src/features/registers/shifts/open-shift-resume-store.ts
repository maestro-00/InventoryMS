export interface OpenShiftResumeHint {
  tenantId: string;
  registerId: string;
  registerName: string;
  shiftId: string;
}

const STORAGE_KEY = "inventoryms.openShiftResume";

type Listener = () => void;

const listeners = new Set<Listener>();

/** In-memory fallback when localStorage is missing or throws (e.g. Vitest without flag). */
let memoryStore: OpenShiftResumeHint[] = [];

function canUseLocalStorage(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const probe = "__inventoryms_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readAll(): OpenShiftResumeHint[] {
  if (!canUseLocalStorage()) return memoryStore;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHint);
  } catch {
    return memoryStore;
  }
}

function isHint(value: unknown): value is OpenShiftResumeHint {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.tenantId === "string" &&
    typeof record.registerId === "string" &&
    typeof record.registerName === "string" &&
    typeof record.shiftId === "string"
  );
}

function writeAll(hints: OpenShiftResumeHint[]): void {
  memoryStore = hints;
  if (canUseLocalStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hints));
    } catch {
      // Keep memoryStore as source of truth.
    }
  }
  for (const listener of listeners) listener();
}

export function listOpenShiftHints(tenantId: string): OpenShiftResumeHint[] {
  return readAll().filter((hint) => hint.tenantId === tenantId);
}

export function setOpenShiftHint(hint: OpenShiftResumeHint): void {
  const others = readAll().filter(
    (entry) =>
      !(entry.tenantId === hint.tenantId && entry.registerId === hint.registerId),
  );
  writeAll([...others, hint]);
}

export function clearOpenShiftHint(tenantId: string, shiftId: string): void {
  writeAll(
    readAll().filter(
      (entry) => !(entry.tenantId === tenantId && entry.shiftId === shiftId),
    ),
  );
}

export function clearOpenShiftHintForRegister(
  tenantId: string,
  registerId: string,
): void {
  writeAll(
    readAll().filter(
      (entry) => !(entry.tenantId === tenantId && entry.registerId === registerId),
    ),
  );
}

export function subscribeOpenShiftHints(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Snapshot for useSyncExternalStore. */
export function getOpenShiftHintsSnapshot(): string {
  return JSON.stringify(readAll());
}

/** Test helper — clears durable and in-memory state. */
export function resetOpenShiftHintsForTests(): void {
  memoryStore = [];
  if (canUseLocalStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  for (const listener of listeners) listener();
}
