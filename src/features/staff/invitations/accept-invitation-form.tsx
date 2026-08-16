import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { acceptInvitation } from "../api/staff-api";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function AcceptInvitationForm({
  userId,
  token,
}: {
  userId: string;
  token: string;
}) {
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => acceptInvitation({ userId, token, password }),
  });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <form aria-label="Accept invitation" className="space-y-3" onSubmit={submit}>
      <h2>Set your password</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Choose password"
        type="password"
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
      />
      <Button type="submit" disabled={mutation.isPending}>
        Accept invitation
      </Button>
      {mutation.isSuccess ? (
        <p role="status">Invitation accepted. You can sign in.</p>
      ) : null}
    </form>
  );
}
