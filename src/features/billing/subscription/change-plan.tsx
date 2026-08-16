import { useMutation } from "@tanstack/react-query";
import {
  downgradePlan,
  upgradePlan,
  useBillingSubscription,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { useState } from "react";

export function ChangePlanForm() {
  const [planId, setPlanId] = useState("");
  const subscription = useBillingSubscription();
  const upgrade = useMutation({ mutationFn: upgradePlan });
  const downgrade = useMutation({ mutationFn: downgradePlan });
  const problem = toProblem(subscription.error ?? upgrade.error ?? downgrade.error);

  return (
    <section aria-label="Change plan" className="space-y-3">
      <h2>Change plan</h2>
      <p>
        Upgrades apply immediately. Downgrades wait until period end after
        acknowledgement.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Target plan id"
        value={planId}
        onChange={(event) => {
          setPlanId(event.target.value);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            upgrade.mutate(planId);
          }}
        >
          Upgrade now
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (window.confirm("Acknowledge period-end downgrade?")) {
              downgrade.mutate(planId);
            }
          }}
        >
          Downgrade at period end
        </Button>
      </div>
    </section>
  );
}
