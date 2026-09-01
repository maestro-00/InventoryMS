import {
  useId,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Input } from "../input";
import { Label } from "../label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { cn } from "../../utils/cn";

const EMPTY_OPTION_VALUE = "__select_empty__";

function toRadixValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "" ? EMPTY_OPTION_VALUE : value;
}

function fromRadixValue(value: string): string {
  return value === EMPTY_OPTION_VALUE ? "" : value;
}

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
    <div className="flex flex-col gap-2.5">
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
  value,
  onChange,
  disabled,
  name,
}: SelectFieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const describedBy = [
    hint ? `${controlId}-hint` : null,
    error ? `${controlId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const stringValue = typeof value === "string" ? value : undefined;
  const hasEmptyOption = options.some((option) => option.value === "");
  const showPlaceholder = stringValue === "" && !hasEmptyOption;
  const radixValue = showPlaceholder ? undefined : toRadixValue(stringValue);

  function handleValueChange(nextValue: string) {
    if (!onChange) {
      return;
    }
    const actualValue = fromRadixValue(nextValue);
    const syntheticTarget = {
      value: actualValue,
      name: name ?? "",
    };
    onChange({
      target: syntheticTarget,
      currentTarget: syntheticTarget,
    } as ChangeEvent<HTMLSelectElement>);
  }

  return (
    <FieldShell
      label={label}
      error={error}
      hint={hint}
      required={required}
      controlId={controlId}
      describedBy={controlId}
    >
      <Select
        onValueChange={handleValueChange}
        {...(radixValue !== undefined ? { value: radixValue } : {})}
        {...(disabled !== undefined ? { disabled } : {})}
        {...(required !== undefined ? { required } : {})}
        {...(name ? { name } : {})}
      >
        <SelectTrigger
          id={controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(error && "border-destructive", className)}
        >
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const itemValue =
              option.value === "" ? EMPTY_OPTION_VALUE : option.value;
            return (
              <SelectItem
                key={itemValue}
                value={itemValue}
                data-option-value={option.value}
              >
                {option.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}
