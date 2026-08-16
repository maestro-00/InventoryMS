import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TelemetryProvider } from "./telemetry-provider";

vi.mock("web-vitals", () => ({
  onLCP: (callback: (metric: { name: string; value: number }) => void) => {
    callback({ name: "LCP", value: 1200 });
  },
  onINP: (callback: (metric: { name: string; value: number }) => void) => {
    callback({ name: "INP", value: 40 });
  },
  onCLS: (callback: (metric: { name: string; value: number }) => void) => {
    callback({ name: "CLS", value: 0.01 });
  },
}));

describe("telemetry provider", () => {
  it("subscribes to web vitals when telemetry is enabled", () => {
    vi.stubEnv("VITE_TELEMETRY_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    render(
      <TelemetryProvider>
        <p>ok</p>
      </TelemetryProvider>,
    );
    expect(info).toHaveBeenCalled();
    info.mockRestore();
    vi.unstubAllEnvs();
  });
});
