import { createFileRoute } from "@tanstack/react-router";
import { OpeningStockForm } from "../../../features/inventory/opening-stock/opening-stock-form";

export const Route = createFileRoute("/_authenticated/inventory/opening-stock")({
  component: OpeningStockPage,
});

function OpeningStockPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Opening stock</h1>
      <OpeningStockForm />
    </div>
  );
}
