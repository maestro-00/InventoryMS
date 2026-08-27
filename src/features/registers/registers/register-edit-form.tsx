import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { updateRegister, type RegisterRecord } from "./api/registers-api";

export function RegisterEditForm({
  register,
  onUpdated,
}: {
  register: RegisterRecord;
  onUpdated?: (register: RegisterRecord) => void;
}) {
  const [name, setName] = useState(register.name);
  const [isActive, setIsActive] = useState(register.isActive);
  const mutation = useMutation({
    mutationFn: () =>
      updateRegister(
        register.id,
        {
          name: name.trim() === register.name ? undefined : name.trim(),
          isActive: isActive === register.isActive ? undefined : isActive,
        },
        register.etag,
      ),
    onSuccess: (updated) => {
      onUpdated?.(updated);
    },
  });
  const problem = toProblem(mutation.error);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isActive && register.isActive) {
      if (!window.confirm(`Deactivate till "${register.name}"?`)) return;
    }
    mutation.mutate();
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border p-3"
      aria-label={`Edit ${register.name}`}
      onSubmit={submit}
      noValidate
    >
      <TextField
        label="Till name"
        required
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
      />
      <label className="flex min-h-touch items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => {
            setIsActive(event.target.checked);
          }}
        />
        Active till
      </label>
      {problem ? <ProblemSummary problem={problem} /> : null}
      {mutation.isSuccess ? (
        <p role="status" className="text-sm">
          Till updated.
        </p>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
        Save till
      </Button>
    </form>
  );
}
