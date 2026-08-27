import { Link } from "@tanstack/react-router";
import { useSession } from "../../shared/auth/session-context";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import { Button } from "../../shared/ui/button";
import { LoadingState } from "../../shared/ui/states/ui-state";
import { ProblemSummary, toProblem } from "../../shared/ui/forms/problem-summary";
import { useTenant } from "../tenant/api/tenant-queries";
import { useOpenShifts } from "../registers/shifts/use-open-shifts";
import { FIRST_SALE_STEP } from "./completion";
import { ONBOARDING_STEPS, completedCount } from "./onboarding-steps";

export function OnboardingChecklist() {
  const tenantQuery = useTenant();
  const { session } = useSession();
  const canSell = session?.permissions.includes("Sell") === true;
  const locationId = useActiveLocationId();

  const { entries: openShiftEntries } = useOpenShifts({
    enabled: canSell && locationId !== "",
    locationId,
  });

  if (tenantQuery.isPending) {
    return <LoadingState label="Loading your onboarding checklist" />;
  }

  if (tenantQuery.isError) {
    return (
      <div className="flex flex-col gap-3">
        <ProblemSummary problem={toProblem(tenantQuery.error)} />
        <Button
          type="button"
          onClick={() => {
            void tenantQuery.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const { tenant } = tenantQuery.data;
  const checklist = tenant.onboardingChecklist;
  const done = completedCount(checklist);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="onboarding-heading">
      <div className="flex flex-col gap-2">
        <h2 id="onboarding-heading" className="text-xl font-semibold">
          Getting started
        </h2>
        <p>
          {done} of {ONBOARDING_STEPS.length} steps complete
        </p>
        <progress
          aria-label="Onboarding progress"
          value={done}
          max={ONBOARDING_STEPS.length}
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={ONBOARDING_STEPS.length}
        />
      </div>

      <ul className="flex flex-col gap-3">
        {ONBOARDING_STEPS.map((step) => {
          const checked = checklist[step.key] === true;
          return (
            <li
              key={step.key}
              aria-label={step.label}
              className="flex min-h-touch items-start gap-3 rounded-md border p-3"
            >
              <input
                type="checkbox"
                id={`onboarding-${step.key}`}
                className="mt-1 size-5"
                checked={checked}
                disabled
                readOnly
                aria-checked={checked}
                aria-label={
                  checked ? `${step.label} complete` : `${step.label} incomplete`
                }
              />
              <div className="min-w-0 flex flex-col gap-1">
                <label htmlFor={`onboarding-${step.key}`} className="font-medium">
                  {step.label}
                </label>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                <Link className="text-sm underline" to={step.to}>
                  Open {step.label.toLowerCase()}
                </Link>
                {step.key === FIRST_SALE_STEP && openShiftEntries.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1" aria-label="Open shifts">
                    {openShiftEntries.map((entry) => (
                      <li key={entry.shift.id}>
                        <Link className="text-sm underline" to="/pos">
                          Resume shift on {entry.registerName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
