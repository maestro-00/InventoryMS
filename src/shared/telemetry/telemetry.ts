type TelemetryPayload = Record<string, string | number | boolean | undefined>;

const SENSITIVE = /token|password|pin|authorization|email|receipt|sale|amount|refresh/i;

export function scrubTelemetryPayload(payload: TelemetryPayload): TelemetryPayload {
  const next: TelemetryPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE.test(key)) continue;
    if (typeof value === "string" && SENSITIVE.test(value)) continue;
    next[key] = value;
  }
  return next;
}

export function captureError(error: Error, context: TelemetryPayload = {}): void {
  const payload = scrubTelemetryPayload({
    name: error.name,
    message: error.message.slice(0, 180),
    ...context,
  });
  if (import.meta.env.VITE_TELEMETRY_ENABLED === "true") {
    console.info("telemetry:error", payload);
  }
}

export function captureWebVital(name: string, value: number): void {
  if (import.meta.env.VITE_TELEMETRY_ENABLED === "true") {
    console.info("telemetry:vital", { name, value });
  }
}

export function captureRouteTiming(routeId: string, durationMs: number): void {
  if (import.meta.env.VITE_TELEMETRY_ENABLED === "true") {
    console.info("telemetry:route", { routeId, durationMs });
  }
}

export function captureSyncState(state: string, pendingCount: number): void {
  if (import.meta.env.VITE_TELEMETRY_ENABLED === "true") {
    console.info("telemetry:sync", { state, pendingCount });
  }
}

export function captureStoragePressure(usageRatio: number): void {
  if (import.meta.env.VITE_TELEMETRY_ENABLED === "true") {
    console.info("telemetry:storage", { usageRatio });
  }
}
