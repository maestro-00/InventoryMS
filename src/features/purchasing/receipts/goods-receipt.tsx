import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { recordGoodsReceipt, type PurchaseOrderRecord } from "../api/purchasing-api";
import { BatchReceiptLines } from "./batch-lines";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function GoodsReceiptForm({
  order,
  locationId,
  requireExpiry = true,
  onReceived,
}: {
  order: PurchaseOrderRecord;
  locationId: string;
  requireExpiry?: boolean;
  onReceived?: (receiptId: string) => void;
}) {
  const line = order.lines[0];
  const [qtyReceived, setQtyReceived] = useState(line ? line.orderedQty : "0");
  const [qtyDamaged, setQtyDamaged] = useState("0");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const mutation = useMutation({
    mutationFn: recordGoodsReceipt,
    onSuccess: (receipt) => onReceived?.(receipt.id),
  });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!line) return;
    mutation.mutate({
      purchaseOrderId: order.id,
      locationId,
      lines: [
        {
          purchaseOrderLineId: line.id,
          qtyReceived: Number(qtyReceived),
          qtyDamaged: Number(qtyDamaged),
          unitCost: Number(line.unitCost),
          ...(batchNumber ? { batchNumber } : {}),
          ...(manufactureDate ? { manufacturedAt: manufactureDate } : {}),
          ...(expiryDate ? { expiresAt: expiryDate } : {}),
        },
      ],
    });
  }

  if (!line) {
    return <p>Select an order with lines before receiving.</p>;
  }

  const outstanding =
    Number(line.orderedQty) - Number(line.receivedQty) - Number(line.damagedQty);

  return (
    <form aria-label="Goods receipt" className="space-y-4" onSubmit={submit}>
      <h2>Receive goods</h2>
      <p>
        Ordered {line.orderedQty}. Outstanding before this receipt: {outstanding}.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Quantity received (saleable)"
        required
        inputMode="decimal"
        value={qtyReceived}
        onChange={(event) => {
          setQtyReceived(event.target.value);
        }}
      />
      <TextField
        label="Quantity damaged"
        required
        inputMode="decimal"
        value={qtyDamaged}
        onChange={(event) => {
          setQtyDamaged(event.target.value);
        }}
      />
      <BatchReceiptLines
        requireExpiry={requireExpiry}
        batchNumber={batchNumber}
        manufactureDate={manufactureDate}
        expiryDate={expiryDate}
        onBatchNumberChange={setBatchNumber}
        onManufactureDateChange={setManufactureDate}
        onExpiryDateChange={setExpiryDate}
      />
      <Button type="submit" disabled={mutation.isPending}>
        Record receipt
      </Button>
      {mutation.data ? (
        <p>
          Receipt {mutation.data.receiptNumber} · order now{" "}
          {mutation.data.purchaseOrderStatus}
        </p>
      ) : null}
    </form>
  );
}
