import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  rejectPurchaseOrder,
  sendPurchaseOrder,
  submitPurchaseOrder,
  type PurchaseOrderRecord,
} from "../api/purchasing-api";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function OrderActions({
  order,
  onChanged,
}: {
  order: PurchaseOrderRecord;
  onChanged: (order: PurchaseOrderRecord) => void | Promise<void>;
}) {
  const [cancelReason, setCancelReason] = useState("");
  const mutation = useMutation({
    mutationFn: async (action: "submit" | "approve" | "reject" | "cancel" | "send") => {
      if (action === "submit") return submitPurchaseOrder(order.id);
      if (action === "approve") return approvePurchaseOrder(order.id);
      if (action === "reject") return rejectPurchaseOrder(order.id);
      if (action === "send") {
        await sendPurchaseOrder(order.id);
        return { ...order, status: "Sent" };
      }
      if (!cancelReason.trim()) throw new Error("Cancellation requires a reason");
      return cancelPurchaseOrder(order.id, cancelReason);
    },
    onSuccess: async (result) => {
      await onChanged(result);
    },
  });
  const problem = toProblem(mutation.error);

  return (
    <section aria-label="Order actions" className="space-y-3">
      <h3>State actions</h3>
      <p>Current status: {order.status}</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            mutation.mutate("submit");
          }}
        >
          Submit
        </Button>
        <Button
          type="button"
          onClick={() => {
            mutation.mutate("approve");
          }}
        >
          Approve
        </Button>
        <Button
          type="button"
          onClick={() => {
            mutation.mutate("reject");
          }}
        >
          Reject
        </Button>
        <Button
          type="button"
          onClick={() => {
            mutation.mutate("send");
          }}
        >
          Send / email supplier
        </Button>
      </div>
      <TextField
        label="Cancel reason"
        value={cancelReason}
        onChange={(event) => {
          setCancelReason(event.target.value);
        }}
      />
      <Button
        type="button"
        onClick={() => {
          if (window.confirm("Cancel this purchase order?")) mutation.mutate("cancel");
        }}
      >
        Cancel order
      </Button>
    </section>
  );
}
