import { createFileRoute } from "@tanstack/react-router";
import { StockLevelsView } from "../../../features/inventory/stock/stock-levels-view";

export const Route = createFileRoute("/_authenticated/inventory/stock")({
  component: StockPage,
});

function StockPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Stock levels</h1>
      <StockLevelsView />
    </div>
  );
}
