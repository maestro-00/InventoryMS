import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { allocateLandedCosts } from "../api/purchasing-api";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function LandedCostForm({ goodsReceiptId }: { goodsReceiptId: string }) {
  const [costType, setCostType] = useState<
    "Freight" | "Duty" | "Clearing" | "Insurance"
  >("Freight");
  const [totalAmount, setTotalAmount] = useState("50.00");
  const mutation = useMutation({ mutationFn: allocateLandedCosts });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({
      goodsReceiptId,
      costType,
      totalAmount: Number(totalAmount),
    });
  }

  return (
    <form aria-label="Landed costs" className="space-y-3" onSubmit={submit}>
      <h2>Allocate landed costs</h2>
      <p>Freight, duty, clearing, and insurance allocate into true unit cost.</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <SelectField
        label="Cost type"
        value={costType}
        options={[
          { value: "Freight", label: "Freight" },
          { value: "Duty", label: "Duty" },
          { value: "Clearing", label: "Clearing" },
          { value: "Insurance", label: "Insurance" },
        ]}
        onChange={(event) => {
          setCostType(
            event.target.value as "Freight" | "Duty" | "Clearing" | "Insurance",
          );
        }}
      />
      <TextField
        label="Total amount"
        required
        inputMode="decimal"
        value={totalAmount}
        onChange={(event) => {
          setTotalAmount(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending}>
        Allocate
      </Button>
      {mutation.data?.lines[0] ? (
        <p>
          New true cost on first line: {mutation.data.lines[0].newUnitCost} (allocated{" "}
          {mutation.data.lines[0].allocatedAmount})
        </p>
      ) : null}
    </form>
  );
}
