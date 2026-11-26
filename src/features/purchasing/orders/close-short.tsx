import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  closePurchaseOrderShort,
  type PurchaseOrderRecord,
} from "../api/purchasing-api";
import { requiresCloseShortReason } from "./purchase-order-state";
import { Button } from "../../../shared/ui/button";
import { useConfirmDialog } from "../../../shared/ui/use-confirm-dialog";
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
  const { confirm, dialog } = useConfirmDialog();
  const mutation = useMutation({
    mutationFn: () => closePurchaseOrderShort(order.id, reason),
    onSuccess: onClosed,
  });
  const problem = toProblem(mutation.error);
  if (!requiresCloseShortReason(order.status)) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason.trim()) return;
    confirm({
      title: "Close this order short?",
      description: "Outstanding quantity will not be received.",
      actionLabel: "Close short",
      onConfirm: () => {
        mutation.mutate();
      },
    });
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
      {dialog}
    </form>
  );
}
