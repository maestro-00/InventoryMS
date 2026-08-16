import { createFileRoute } from "@tanstack/react-router";
import { TransferWorkflow } from "../../../features/inventory/transfers/transfer-workflow";

export const Route = createFileRoute("/_authenticated/inventory/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Transfers</h1>
      <TransferWorkflow />
    </div>
  );
}
