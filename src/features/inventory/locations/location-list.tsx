import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { EmptyState, LoadingState } from "../../../shared/ui/states/ui-state";
import { useLocations } from "./api/location-queries";

export function LocationList({
  selectedId,
  onSelect,
  onCreate,
}: {
  selectedId: string | undefined;
  onSelect: (locationId: string) => void;
  onCreate?: () => void;
}) {
  const locations = useLocations();

  if (locations.isPending) return <LoadingState label="Loading locations" />;
  if (locations.isError) return <ProblemSummary problem={toProblem(locations.error)} />;

  if (locations.data.length === 0) {
    return (
      <EmptyState
        title="No locations yet. A location is the shop or store where stock is held."
        actionLabel="Create your first location"
        onAction={() => onCreate?.()}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {locations.data.map((location) => (
        <li
          key={location.id}
          className="flex items-center justify-between gap-3 rounded-md border p-3"
        >
          <span>
            {location.name}
            {location.id === selectedId ? " (selected)" : ""}
          </span>
          <Button
            type="button"
            variant={location.id === selectedId ? "default" : "outline"}
            aria-pressed={location.id === selectedId}
            onClick={() => {
              onSelect(location.id);
            }}
          >
            Select {location.name}
          </Button>
        </li>
      ))}
    </ul>
  );
}
