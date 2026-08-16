import { createFileRoute } from "@tanstack/react-router";
import { MovementsPanel } from "../../../features/inventory/movements/movements-panel";

export const Route = createFileRoute("/_authenticated/inventory/movements")({
  component: MovementsPage,
});

function MovementsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Stock movements</h1>
      <MovementsPanel />
    </div>
  );
}
