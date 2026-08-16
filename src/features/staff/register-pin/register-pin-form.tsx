import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { setRegisterPin } from "../api/staff-api";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function RegisterPinForm({ userId }: { userId: string }) {
  const [pin, setPin] = useState("");
  const mutation = useMutation({
    mutationFn: () => setRegisterPin(userId, pin),
  });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!window.confirm("Replace this user's register PIN?")) return;
    mutation.mutate();
  }

  return (
    <form aria-label="Register PIN" className="space-y-3" onSubmit={submit}>
      <h2>Register PIN</h2>
      <p>PINs are write-only. InventoryX never returns the current value.</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="New PIN"
        required
        inputMode="numeric"
        value={pin}
        onChange={(event) => {
          setPin(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending}>
        Set PIN
      </Button>
      {mutation.isSuccess ? <p role="status">PIN updated.</p> : null}
    </form>
  );
}
