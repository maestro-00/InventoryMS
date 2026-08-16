import { createFileRoute } from "@tanstack/react-router";
import { ConsumptionForm } from "../../../features/inventory/consumption/consumption-form";

export const Route = createFileRoute("/_authenticated/inventory/consumption")({
  component: ConsumptionPage,
});

function ConsumptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Internal consumption</h1>
      <ConsumptionForm />
    </div>
  );
}
