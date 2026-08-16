import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useSession } from "../../../shared/auth/session-context";
import { decimalStringSchema } from "../../../shared/money/decimal";
import { Button } from "../../../shared/ui/button";
import { SelectField, TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { DenialState, LoadingState } from "../../../shared/ui/states/ui-state";
import { BUSINESS_PROFILE_STEP, checklistAfterStep } from "../../onboarding/completion";
import { useTenant, useUpdateTenant } from "../../tenant/api/tenant-queries";
import {
  VALUATION_METHODS,
  type TenantProfile,
  type TenantUpdate,
} from "../../tenant/api/tenant-api";

const TENANT_SETTINGS_ROLES = new Set(["Owner", "Admin"]);

const THRESHOLD_FIELDS = [
  { key: "adjustmentApprovalThreshold", label: "Stock adjustment approval threshold" },
  { key: "poApprovalThreshold", label: "Purchase order approval threshold" },
  { key: "tillVarianceThreshold", label: "Till variance threshold" },
  { key: "returnAuthorizationThreshold", label: "Return authorisation threshold" },
] as const;

type ThresholdKey = (typeof THRESHOLD_FIELDS)[number]["key"];

const thresholdSchema = z.record(z.string(), decimalStringSchema);

export function BusinessSettings() {
  const { session } = useSession();
  const allowed = session ? TENANT_SETTINGS_ROLES.has(session.role) : false;

  const tenant = useTenant();

  if (!allowed) return <DenialState destination="/dashboard" />;
  if (tenant.isPending) return <LoadingState label="Loading business settings" />;
  if (tenant.isError) return <ProblemSummary problem={toProblem(tenant.error)} />;

  return (
    <BusinessSettingsForm
      saved={tenant.data.tenant}
      etag={tenant.data.etag}
      // Remount on a fresh load so every draft starts from the server's values.
      key={tenant.dataUpdatedAt}
    />
  );
}

function BusinessSettingsForm({
  saved,
  etag,
}: {
  saved: TenantProfile;
  etag: string | undefined;
}) {
  const update = useUpdateTenant();

  const [profile, setProfile] = useState({
    name: saved.name,
    address: saved.address ?? "",
    phone: saved.phone ?? "",
    billingEmail: saved.billingEmail ?? "",
  });
  const [valuationMethod, setValuationMethod] = useState(saved.valuationMethod);
  const [valuationConfirmed, setValuationConfirmed] = useState(false);
  const [thresholds, setThresholds] = useState<Record<ThresholdKey, string>>({
    adjustmentApprovalThreshold: saved.adjustmentApprovalThreshold ?? "",
    poApprovalThreshold: saved.poApprovalThreshold ?? "",
    tillVarianceThreshold: saved.tillVarianceThreshold ?? "",
    returnAuthorizationThreshold: saved.returnAuthorizationThreshold ?? "",
  });
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  function apply(change: TenantUpdate) {
    setClientErrors([]);
    update.mutate({ update: change, ...(etag ? { etag } : {}) });
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checklist = checklistAfterStep(
      saved.onboardingChecklist,
      BUSINESS_PROFILE_STEP,
    );
    apply({
      name: profile.name,
      address: profile.address,
      phone: profile.phone,
      billingEmail: profile.billingEmail,
      ...(checklist ? { onboardingChecklist: checklist } : {}),
    });
  }

  function saveValuation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const changed = valuationMethod !== saved.valuationMethod;
    if (changed && !valuationConfirmed) {
      setClientErrors([
        "Confirm the valuation change before saving: it changes how stock is costed from now on.",
      ]);
      return;
    }
    apply({ valuationMethod, confirmValuationChange: changed });
  }

  function saveThresholds(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entries = Object.entries(thresholds).filter(
      ([, value]) => value.trim() !== "",
    );
    const parsed = thresholdSchema.safeParse(Object.fromEntries(entries));
    if (!parsed.success) {
      setClientErrors(parsed.error.issues.map((issue) => issue.message));
      return;
    }
    apply(parsed.data);
  }

  const problem = toProblem(update.error);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Business settings</h1>
      {clientErrors.length > 0 ? (
        <ProblemSummary
          key={clientErrors.join("|")}
          messages={clientErrors}
          title="Check the highlighted settings"
        />
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}
      {update.isSuccess ? <p role="status">Business settings saved.</p> : null}

      <form className="flex flex-col gap-4" onSubmit={saveProfile} noValidate>
        <h2 className="text-lg font-semibold">Business profile</h2>
        <TextField
          label="Business name"
          required
          value={profile.name}
          onChange={(event) => {
            setProfile((current) => ({ ...current, name: event.target.value }));
          }}
        />
        <TextField
          label="Business address"
          value={profile.address}
          onChange={(event) => {
            setProfile((current) => ({ ...current, address: event.target.value }));
          }}
        />
        <TextField
          label="Phone number"
          value={profile.phone}
          onChange={(event) => {
            setProfile((current) => ({ ...current, phone: event.target.value }));
          }}
        />
        <TextField
          label="Billing email"
          type="email"
          value={profile.billingEmail}
          onChange={(event) => {
            setProfile((current) => ({ ...current, billingEmail: event.target.value }));
          }}
        />
        <Button type="submit" disabled={update.isPending}>
          Save business profile
        </Button>
      </form>

      <form className="flex flex-col gap-4" onSubmit={saveValuation} noValidate>
        <h2 className="text-lg font-semibold">Stock valuation</h2>
        <SelectField
          label="Valuation method"
          hint="InventoryX costs every movement with this method; existing history is not restated."
          options={VALUATION_METHODS.map((method) => ({
            value: method,
            label: method,
          }))}
          value={valuationMethod}
          onChange={(event) => {
            setValuationMethod(event.target.value);
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={valuationConfirmed}
            onChange={(event) => {
              setValuationConfirmed(event.target.checked);
            }}
          />
          I understand this changes how stock is costed from now on.
        </label>
        <Button type="submit" disabled={update.isPending}>
          Save valuation method
        </Button>
      </form>

      <form className="flex flex-col gap-4" onSubmit={saveThresholds} noValidate>
        <h2 className="text-lg font-semibold">Approval thresholds</h2>
        {THRESHOLD_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            inputMode="decimal"
            value={thresholds[field.key]}
            onChange={(event) => {
              const value = event.target.value;
              setThresholds((current) => ({ ...current, [field.key]: value }));
            }}
          />
        ))}
        <Button type="submit" disabled={update.isPending}>
          Save approval thresholds
        </Button>
      </form>
    </div>
  );
}
