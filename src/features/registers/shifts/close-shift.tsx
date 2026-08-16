import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import {
  apiDecimalSchema,
  uuidSchema,
} from "../../../shared/api/client/boundary-schema";
import { decimalStringSchema } from "../../../shared/money/decimal";
import { sessionManager } from "../../../shared/auth/session-manager";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

const origin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

const closeSchema = z.object({
  shiftId: uuidSchema,
  closingCounted: decimalStringSchema,
});

const closeResultSchema = z.object({
  id: uuidSchema,
  expectedCash: apiDecimalSchema,
  countedCash: apiDecimalSchema,
  variance: apiDecimalSchema,
  managerFlag: z.boolean().optional(),
  status: z.string(),
});

export type CloseShiftResult = z.infer<typeof closeResultSchema>;

export async function closeShift(input: z.infer<typeof closeSchema>) {
  const parsed = closeSchema.parse(input);
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const token = sessionManager.getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${origin}/api/v1/shifts/${parsed.shiftId}/close`, {
    method: "POST",
    headers,
    body: JSON.stringify({ closingCounted: parsed.closingCounted }),
  });
  if (!response.ok) throw new Error("Close shift failed");
  return closeResultSchema.parse(await response.json());
}

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
      <TextField
        label="Closing counted cash"
        required
        inputMode="decimal"
        value={closingCounted}
        onChange={(event) => {
          setClosingCounted(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending}>
        Close with count
      </Button>
      {mutation.data ? (
        <dl>
          <div>
            <dt>Expected</dt>
            <dd>{mutation.data.expectedCash}</dd>
          </div>
          <div>
            <dt>Counted</dt>
            <dd>{mutation.data.countedCash}</dd>
          </div>
          <div>
            <dt>Variance</dt>
            <dd>{mutation.data.variance}</dd>
          </div>
          {mutation.data.managerFlag ? <p>Manager review flagged.</p> : null}
        </dl>
      ) : null}
    </form>
  );
}
