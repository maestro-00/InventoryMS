import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  openShift,
  openShiftInputSchema,
  type RegisterRecord,
  type ShiftRecord,
} from "../registers/api/registers-api";

export function OpenShift({
  registers,
  onOpened,
}: {
  registers: RegisterRecord[];
  onOpened: (shift: ShiftRecord) => void;
}) {
  const [registerId, setRegisterId] = useState(registers[0]?.id ?? "");
  const [openingFloat, setOpeningFloat] = useState("0.00");
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: openShift,
    onSuccess: (shift) => {
      onOpened(shift);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = openShiftInputSchema.safeParse({ registerId, openingFloat });
    if (!parsed.success) {
      setClientErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setClientErrors([]);
    mutation.mutate(parsed.data);
  }

  const problem = toProblem(mutation.error);

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <p>Open a shift before selling so every sale lands on a till session.</p>
      {clientErrors.length > 0 ? (
        <ProblemSummary
          key={clientErrors.join("|")}
          messages={clientErrors}
          title="Check the shift details"
        />
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}

      <SelectField
        label="Register"
        required
        options={registers.map((register) => ({
          value: register.id,
          label: register.name,
        }))}
        value={registerId}
        onChange={(event) => {
          setRegisterId(event.target.value);
        }}
      />
      <TextField
        label="Opening float"
        required
        inputMode="decimal"
        hint="Cash in the drawer at the start of the shift."
        value={openingFloat}
        onChange={(event) => {
          setOpeningFloat(event.target.value);
        }}
      />
      <Button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
      >
        Open shift
      </Button>
    </form>
  );
}
