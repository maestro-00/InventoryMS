import { useEffect, type ReactNode } from "react";
import { onCLS, onINP, onLCP } from "web-vitals";
import { captureWebVital } from "../../shared/telemetry/telemetry";

export function TelemetryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (import.meta.env.VITE_TELEMETRY_ENABLED !== "true") return;
    onLCP((metric) => {
      captureWebVital(metric.name, metric.value);
    });
    onINP((metric) => {
      captureWebVital(metric.name, metric.value);
    });
    onCLS((metric) => {
      captureWebVital(metric.name, metric.value);
    });
  }, []);
  return children;
}
