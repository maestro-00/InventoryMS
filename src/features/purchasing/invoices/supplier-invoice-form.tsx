import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { recordSupplierInvoice } from "../api/purchasing-api";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function SupplierInvoiceForm({
  supplierId,
  purchaseOrderId,
  productId,
  orderedUnitCost,
}: {
  supplierId: string;
  purchaseOrderId?: string;
  productId: string;
  orderedUnitCost: string;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState("20");
  const [unitPrice, setUnitPrice] = useState(orderedUnitCost);

  const mutation = useMutation({ mutationFn: recordSupplierInvoice });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      supplierId,
      ...(purchaseOrderId ? { purchaseOrderId } : {}),
      invoiceNumber,
      invoiceDate: new Date(invoiceDate).toISOString(),
      lines: [{ productId, qty: Number(qty), unitPrice: Number(unitPrice) }],
    });
  }

  return (
    <form aria-label="Supplier invoice" className="space-y-3" onSubmit={submit}>
      <h2>Match supplier invoice</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Invoice number"
        required
        value={invoiceNumber}
        onChange={(event) => {
          setInvoiceNumber(event.target.value);
        }}
      />
      <TextField
        label="Invoice date"
        type="date"
        required
        value={invoiceDate}
        onChange={(event) => {
          setInvoiceDate(event.target.value);
        }}
      />
      <TextField
        label="Qty"
        required
        value={qty}
        onChange={(event) => {
          setQty(event.target.value);
        }}
      />
      <TextField
        label="Invoice unit price"
        required
        value={unitPrice}
        onChange={(event) => {
          setUnitPrice(event.target.value);
        }}
      />
      <p>Ordered unit cost: {orderedUnitCost}</p>
      <Button type="submit" disabled={mutation.isPending}>
        Record invoice
      </Button>
      {mutation.data?.hasPriceVariance ? (
        <p role="status">Price difference flagged on one or more lines.</p>
      ) : null}
      {mutation.data && !mutation.data.hasPriceVariance ? (
        <p role="status">Invoice matched without price variance.</p>
      ) : null}
    </form>
  );
}
