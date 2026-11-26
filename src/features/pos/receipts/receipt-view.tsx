import { useQuery } from "@tanstack/react-query";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { Button } from "../../../shared/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../../../shared/ui/alert";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import type { SaleRecord } from "../sales/api/sales-api";
import { fetchReceipt } from "./api/receipts-api";
import { ReceiptDelivery } from "./receipt-delivery";

export function ReceiptView({
  sale,
  onNewSale,
  onViewHistory,
}: {
  sale: SaleRecord;
  onNewSale: () => void;
  onViewHistory: () => void;
}) {
  const receipt = useQuery({
    queryKey: ["receipt", sale.id],
    queryFn: () => fetchReceipt(sale.id),
  });

  const completedNotice = (
    <Alert role="status" variant="success">
      <AlertTitle>Sale completed</AlertTitle>
      <AlertDescription>
        The payment was recorded. You can start a new sale or view this sale in history.
      </AlertDescription>
    </Alert>
  );

  if (receipt.isPending)
    return (
      <section className="flex flex-col gap-3">
        {completedNotice}
        <LoadingState label="Loading receipt" />
      </section>
    );
  if (receipt.isError)
    return (
      <section className="flex flex-col gap-3">
        {completedNotice}
        <ProblemSummary
          problem={toProblem(receipt.error)}
          title="Receipt could not be loaded"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void receipt.refetch()}>
            Try loading receipt again
          </Button>
          <Button type="button" variant="outline" onClick={onNewSale}>
            Start a new sale
          </Button>
        </div>
      </section>
    );

  return (
    <section className="flex flex-col gap-3" aria-labelledby="receipt-heading">
      {completedNotice}
      <h2 id="receipt-heading" className="text-lg font-semibold">
        Receipt {receipt.data.number}
      </h2>
      <ul className="flex flex-col gap-1">
        {sale.lines.map((line) => (
          <li key={line.id}>
            {line.productName} × {line.qty} @ {formatGhanaMoney(line.unitPrice)}
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-2 gap-1">
        <dt>Subtotal</dt>
        <dd>{formatGhanaMoney(sale.subtotal)}</dd>
        <dt>Tax</dt>
        <dd>{formatGhanaMoney(sale.taxTotal)}</dd>
        <dt>Total</dt>
        <dd>{formatGhanaMoney(sale.grandTotal)}</dd>
        <dt>Change due</dt>
        <dd>{formatGhanaMoney(sale.changeDue)}</dd>
      </dl>
      <span className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            globalThis.print();
          }}
        >
          Print receipt
        </Button>
        <Button type="button" variant="outline" onClick={onViewHistory}>
          View sale history
        </Button>
        <Button type="button" variant="outline" onClick={onNewSale}>
          Start a new sale
        </Button>
      </span>
      <ReceiptDelivery saleId={sale.id} />
    </section>
  );
}
