import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { REGISTER_STEP } from "../../onboarding/completion";
import { useMarkOnboardingStep } from "../../onboarding/mark-onboarding-step";
import {
  createRegister,
  registerInputSchema,
  type RegisterRecord,
} from "./api/registers-api";

export function RegisterForm({
  locationId,
  onCreated,
  hasExistingRegisters = false,
}: {
  locationId: string;
  onCreated: (register: RegisterRecord) => void;
  hasExistingRegisters?: boolean;
}) {
  const [name, setName] = useState("");
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const markOnboardingStep = useMarkOnboardingStep();

  const mutation = useMutation({
    mutationFn: createRegister,
    onSuccess: (register) => {
      markOnboardingStep(REGISTER_STEP);
      onCreated(register);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = registerInputSchema.safeParse({ locationId, name });
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
      <p>
        {hasExistingRegisters
          ? "Add another till for this location. Each register can open its own shift."
          : "A register is the till you sell from. Create the first one for this location."}
      </p>
      {clientErrors.length > 0 ? (
        <ProblemSummary
          key={clientErrors.join("|")}
          messages={clientErrors}
          title="Check the register name"
        />
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}

      <TextField
        label="Register name"
        required
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      <Button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
      >
        Create register
      </Button>
    </form>
  );
}
