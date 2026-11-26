import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { setRegisterPin } from "../api/staff-api";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../shared/ui/alert-dialog";

export function RegisterPinForm({ userId }: { userId: string }) {
  const [pin, setPin] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => setRegisterPin(userId, pin),
  });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!mutation.isPending) setConfirmOpen(true);
  }

  return (
    <form aria-label="Register PIN" className="space-y-3" onSubmit={submit}>
      <h2>Register PIN</h2>
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
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this user’s register PIN?</AlertDialogTitle>
            <AlertDialogDescription>
              They will need to use the new PIN the next time they unlock a till.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                mutation.mutate();
              }}
            >
              Set PIN
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
