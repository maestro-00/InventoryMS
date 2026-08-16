import { createFileRoute } from "@tanstack/react-router";
import { ReorderSuggestions } from "../../../features/inventory/reorder/reorder-suggestions";

export const Route = createFileRoute("/_authenticated/inventory/reorder")({
  component: ReorderPage,
});

function ReorderPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Reorder suggestions</h1>
      <ReorderSuggestions />
    </div>
  );
}
