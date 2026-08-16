import { createFileRoute } from "@tanstack/react-router";
import { CountWorkflow } from "../../../features/inventory/counts/count-workflow";

export const Route = createFileRoute("/_authenticated/inventory/counts")({
  component: CountsPage,
});

function CountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Stock counts</h1>
      <CountWorkflow />
    </div>
  );
}
