import { createFileRoute } from "@tanstack/react-router";
import { AlertsPanel } from "../../../features/inventory/alerts/alerts-panel";

export const Route = createFileRoute("/_authenticated/inventory/alerts")({
  component: AlertsPage,
});

function AlertsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Stock alerts</h1>
      <AlertsPanel />
    </div>
  );
}
