import { createFileRoute } from "@tanstack/react-router";
import { AdjustmentForm } from "../../../features/inventory/adjustments/adjustment-form";

export const Route = createFileRoute("/_authenticated/inventory/adjustments")({
  component: AdjustmentsPage,
});

function AdjustmentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Stock adjustments</h1>
      <AdjustmentForm />
    </div>
  );
}
