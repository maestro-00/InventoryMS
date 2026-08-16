import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  closePurchaseOrderShort,
  type PurchaseOrderRecord,
} from "../api/purchasing-api";
import { requiresCloseShortReason } from "./purchase-order-state";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function CloseShortForm({
  order,
  onClosed,
}: {
  order: PurchaseOrderRecord;
  onClosed: (order: PurchaseOrderRecord) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () => closePurchaseOrderShort(order.id, reason),
    onSuccess: onClosed,
  });
  const problem = toProblem(mutation.error);
  if (!requiresCloseShortReason(order.status)) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return;
    if (
      !window.confirm("Close this order short? Outstanding qty will not be received.")
    ) {
      return;
    }
    mutation.mutate();
  }

  return (
    <form aria-label="Close short" className="space-y-3" onSubmit={submit}>
      <h3>Close short</h3>
      <p>A reason is required when outstanding quantity will not arrive.</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Close-short reason"
        required
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending || !reason.trim()}>
        Close short
      </Button>
    </form>
  );
}
