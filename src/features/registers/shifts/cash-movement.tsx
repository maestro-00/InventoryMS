import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { recordCashMovement } from "./shifts-api";

export function CashMovementForm({ shiftId }: { shiftId: string }) {
  const [direction, setDirection] = useState<"CashIn" | "CashOut">("CashOut");
  const [reason, setReason] = useState<
    "PettyCash" | "Banking" | "ChangeOrder" | "Other"
  >("PettyCash");
  const [amount, setAmount] = useState("0.00");
  const [note, setNote] = useState("");
  const mutation = useMutation({ mutationFn: recordCashMovement });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ shiftId, direction, reason, amount, note });
  }

  return (
    <form className="space-y-3" onSubmit={submit} noValidate aria-label="Cash movement">
      <h2>Cash in / cash out</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <SelectField
        label="Direction"
        value={direction}
        options={[
          { value: "CashIn", label: "Cash in" },
          { value: "CashOut", label: "Cash out" },
        ]}
        onChange={(event) => {
          setDirection(event.target.value as "CashIn" | "CashOut");
        }}
      />
      <SelectField
        label="Reason"
        value={reason}
        options={[
          { value: "PettyCash", label: "Petty cash" },
          { value: "Banking", label: "Banking" },
          { value: "ChangeOrder", label: "Change order" },
          { value: "Other", label: "Other" },
        ]}
        onChange={(event) => {
          setReason(event.target.value as typeof reason);
        }}
      />
      <TextField
        label="Amount"
        required
        inputMode="decimal"
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
        }}
      />
      <TextField
        label="Note"
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending}>
        Record movement
      </Button>
    </form>
  );
}
