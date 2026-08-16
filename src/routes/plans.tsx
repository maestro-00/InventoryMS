import { createFileRoute } from "@tanstack/react-router";
import { PlanComparison } from "../features/billing/plans/plan-comparison";

export const Route = createFileRoute("/plans")({
  component: PlansPage,
});

function PlansPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <h1>Plans</h1>
      <PlanComparison />
    </main>
  );
}
