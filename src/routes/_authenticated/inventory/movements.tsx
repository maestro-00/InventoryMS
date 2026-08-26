import { createFileRoute } from "@tanstack/react-router";
import { MovementsPanel } from "../../../features/inventory/movements/movements-panel";
import { useActiveLocationId } from "../../../shared/location/use-active-location";

export const Route = createFileRoute("/_authenticated/inventory/movements")({
  component: MovementsPage,
});

function MovementsPage() {
  const locationId = useActiveLocationId();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Stock movements</h1>
      {locationId ? <MovementsPanel locationId={locationId} /> : <MovementsPanel />}
    </div>
  );
}
