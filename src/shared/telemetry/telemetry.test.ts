import { describe, expect, it, vi } from "vitest";
import {
  captureError,
  captureRouteTiming,
  captureStoragePressure,
  captureSyncState,
  captureWebVital,
  scrubTelemetryPayload,
} from "./telemetry";

describe("telemetry boundary", () => {
  it("does not emit tokens or financial payloads", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    captureError(new Error("failed"), {
      traceId: "trace-1",
      token: "secret",
      amount: "9.99",
    });
    captureWebVital("LCP", 1200);
    captureRouteTiming("/pos", 80);
    captureSyncState("idle", 0);
    captureStoragePressure(0.2);
    const scrubbed = scrubTelemetryPayload({
      traceId: "trace-1",
      token: "secret",
      amount: "9.99",
      routeId: "/pos",
      note: "refresh-token leaked",
    });
    expect(scrubbed.traceId).toBe("trace-1");
    expect(scrubbed.routeId).toBe("/pos");
    expect(scrubbed.token).toBeUndefined();
    expect(scrubbed.amount).toBeUndefined();
    expect(scrubbed.note).toBeUndefined();
    info.mockRestore();
  });

  it("emits scrubbed events when telemetry is enabled", () => {
    vi.stubEnv("VITE_TELEMETRY_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    captureError(new Error("failed"), { traceId: "trace-2" });
    captureWebVital("INP", 40);
    captureRouteTiming("/dashboard", 12);
    captureSyncState("pending", 3);
    captureStoragePressure(0.8);
    expect(info).toHaveBeenCalled();
    info.mockRestore();
    vi.unstubAllEnvs();
  });
});
