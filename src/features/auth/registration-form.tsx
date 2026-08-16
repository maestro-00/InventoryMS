import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "../../shared/ui/button";
import { SelectField, TextField } from "../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../shared/ui/forms/problem-summary";
import {
  registerTenant,
  registerTenantInputSchema,
  type RegisterTenantInput,
  type TenantRegistration,
} from "./api/auth-api";

const COUNTRIES = [{ value: "GH", label: "Ghana" }];
const CURRENCIES = [{ value: "GHS", label: "Ghana cedi (GHS)" }];
const BUSINESS_TYPES = [
  { value: "Retail", label: "Retail" },
  { value: "Wholesale", label: "Wholesale" },
  { value: "Pharmacy", label: "Pharmacy" },
  { value: "Restaurant", label: "Restaurant" },
];

const EMPTY: RegisterTenantInput = {
  email: "",
  password: "",
  businessName: "",
  country: "GH",
  currency: "GHS",
  businessType: "Retail",
};

export function RegistrationForm({
  onRegistered,
}: {
  onRegistered: (result: TenantRegistration) => void;
}) {
  const [values, setValues] = useState<RegisterTenantInput>(EMPTY);
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: registerTenant,
    onSuccess: (result) => {
      onRegistered(result);
    },
  });

  function update<K extends keyof RegisterTenantInput>(
    key: K,
    value: RegisterTenantInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = registerTenantInputSchema.safeParse(values);
    if (!parsed.success) {
      setClientErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    setClientErrors([]);
    mutation.mutate(parsed.data);
  }

  const problem = toProblem(mutation.error);

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">{mutation.data.businessName} is ready</h2>
        <p role="status">
          Your 14-day Professional trial has started. Continue with the onboarding
          checklist to make your first sale.
        </p>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {clientErrors.length > 0 ? (
        <ProblemSummary
          messages={clientErrors}
          title="Check the highlighted fields"
          key={clientErrors.join("|")}
        />
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={values.email}
        error={problem?.fieldErrors["email"]?.join(" ")}
        onChange={(event) => {
          update("email", event.target.value);
        }}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint="Use at least 12 characters."
        value={values.password}
        error={problem?.fieldErrors["password"]?.join(" ")}
        onChange={(event) => {
          update("password", event.target.value);
        }}
      />
      <TextField
        label="Business name"
        required
        value={values.businessName}
        error={problem?.fieldErrors["businessName"]?.join(" ")}
        onChange={(event) => {
          update("businessName", event.target.value);
        }}
      />
      <SelectField
        label="Country"
        options={COUNTRIES}
        value={values.country}
        onChange={(event) => {
          update("country", event.target.value);
        }}
      />
      <SelectField
        label="Currency"
        options={CURRENCIES}
        value={values.currency}
        onChange={(event) => {
          update("currency", event.target.value);
        }}
      />
      <SelectField
        label="Business type"
        options={BUSINESS_TYPES}
        value={values.businessType}
        onChange={(event) => {
          update("businessType", event.target.value);
        }}
      />

      <Button
        type="submit"
        disabled={mutation.isPending}
        aria-busy={mutation.isPending}
      >
        {mutation.isPending ? "Creating business…" : "Create business"}
      </Button>
    </form>
  );
}
