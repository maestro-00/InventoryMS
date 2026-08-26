import { createFileRoute } from "@tanstack/react-router";
import { ReorderSuggestions } from "../../../features/inventory/reorder/reorder-suggestions";
import { useActiveLocationId } from "../../../shared/location/use-active-location";

export const Route = createFileRoute("/_authenticated/inventory/reorder")({
  component: ReorderPage,
});

function ReorderPage() {
  const locationId = useActiveLocationId();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reorder suggestions</h1>
      {locationId ? (
        <ReorderSuggestions locationId={locationId} />
      ) : (
        <ReorderSuggestions />
      )}
    </div>
  );
}
