import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  closeShift,
  type CloseShiftResult,
} from "./shifts-api";

export type { CloseShiftResult };

export function CloseShiftForm({
  shiftId,
  onClosed,
}: {
  shiftId: string;
  onClosed?: (result: CloseShiftResult) => void;
}) {
  const [closingCounted, setClosingCounted] = useState("0.00");
  const mutation = useMutation({
    mutationFn: closeShift,
    onSuccess: (result) => onClosed?.(result),
  });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !window.confirm(
        `Confirm closing count ${closingCounted}? Variance will be calculated by InventoryX.`,
      )
    ) {
      return;
    }
    mutation.mutate({ shiftId, closingCounted });
  }

  return (
    <form className="space-y-3" onSubmit={submit} noValidate aria-label="Close shift">
      <h2>Close shift</h2>
      <p>Counted cash is required. Expected cash and variance come from InventoryX.</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      {mutation.isSuccess ? (
        <p role="status" className="rounded-md border border-accent/40 p-3 text-sm">
          Shift closed ({mutation.data.status}).
        </p>
      ) : null}
      <TextField
        label="Closing counted cash"
        required
        inputMode="decimal"
        value={closingCounted}
        onChange={(event) => {
          setClosingCounted(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
        {mutation.isPending ? "Closing…" : "Close with count"}
      </Button>
    </form>
  );
}
