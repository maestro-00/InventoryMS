import { describe, expect, it, vi } from "vitest";
import { captureError, scrubTelemetryPayload } from "./telemetry";

/**
 * Telemetry privacy allowlist / redaction (T218).
 * Allowed keys are operational only: route ids, metric names, counts, ratios, trace ids.
 * Financial amounts, tokens, emails, receipt bodies, and authorization material must drop.
 */

const ALLOWED_KEYS = new Set([
  "traceId",
  "routeId",
  "name",
  "message",
  "durationMs",
  "pendingCount",
  "usageRatio",
  "state",
  "value",
]);

describe("telemetry privacy allowlist", () => {
  it("redacts sensitive keys and values even when mixed into an event", () => {
    const scrubbed = scrubTelemetryPayload({
      traceId: "trace-privacy-1",
      routeId: "/pos",
      token: "eyJhbGciOiJIUzI1NiJ9",
      refreshToken: "rotating",
      password: "hunter2",
      pin: "1234",
      authorization: "Bearer secret",
      email: "owner@example.com",
      receipt: "Sugar 1kg x2 total 20.00",
      sale: "sale-uuid",
      amount: "20.00",
      note: "contains refresh token leak",
    });

    expect(Object.keys(scrubbed).sort()).toEqual(["routeId", "traceId"]);
    for (const key of Object.keys(scrubbed)) {
      expect(ALLOWED_KEYS.has(key)).toBe(true);
    }
  });

  it("never logs scrubbed secrets when telemetry is enabled", () => {
    vi.stubEnv("VITE_TELEMETRY_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    captureError(new Error("sync failed"), {
      token: "secret-access",
      amount: "9.99",
      email: "cashier@shop.gh",
      traceId: "trace-privacy-2",
    });
    expect(info).toHaveBeenCalled();
    const payload = info.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.traceId).toBe("trace-privacy-2");
    expect(payload.token).toBeUndefined();
    expect(payload.amount).toBeUndefined();
    expect(payload.email).toBeUndefined();
    info.mockRestore();
    vi.unstubAllEnvs();
  });
});
