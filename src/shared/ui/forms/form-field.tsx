import { useId, type ComponentProps, type ReactNode } from "react";
import { Input } from "../input";
import { Label } from "../label";
import { cn } from "../../utils/cn";

export interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
}

function FieldShell({
  label,
  error,
  hint,
  required,
  controlId,
  describedBy,
  children,
}: FieldProps & {
  controlId: string;
  describedBy: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={controlId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
      {hint ? (
        <p
          id={`${describedBy ?? controlId}-hint`}
          className="text-xs text-muted-foreground"
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${controlId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = FieldProps &
  Omit<ComponentProps<"input">, "id"> & { id?: string };

export function TextField({
  label,
  error,
  hint,
  required,
  className,
  id,
  ...input
}: TextFieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const describedBy = [
    hint ? `${controlId}-hint` : null,
    error ? `${controlId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      controlId={controlId}
      describedBy={controlId}
    >
      <Input
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(error && "border-destructive", className)}
        {...input}
      />
    </FieldShell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectFieldProps = FieldProps &
  Omit<ComponentProps<"select">, "id"> & { id?: string; options: SelectOption[] };

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  className,
  id,
  ...select
}: SelectFieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const describedBy = [
    hint ? `${controlId}-hint` : null,
    error ? `${controlId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      controlId={controlId}
      describedBy={controlId}
    >
      <select
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          error && "border-destructive",
          className,
        )}
        {...select}
      >
        {typeof select.value === "string" &&
        select.value === "" &&
        !options.some((option) => option.value === "") ? (
          <option value="" disabled>
            Select…
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
