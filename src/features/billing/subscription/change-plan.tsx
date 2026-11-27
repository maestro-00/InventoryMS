import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSubscriptionQuote,
  downgradePlan,
  scheduleSubscriptionChange,
  upgradePlan,
  useBillingSubscription,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { useConfirmDialog } from "../../../shared/ui/use-confirm-dialog";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { useState } from "react";

export function ChangePlanForm() {
  const { confirm, dialog } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [planId, setPlanId] = useState("");
  const [cycle, setCycle] = useState("Monthly");
  const subscription = useBillingSubscription();
  const upgrade = useMutation({ mutationFn: upgradePlan });
  const downgrade = useMutation({ mutationFn: downgradePlan });
  const quote = useMutation({ mutationFn: createSubscriptionQuote });
  const schedule = useMutation({
    mutationFn: scheduleSubscriptionChange,
    onSuccess: (data) => {
      queryClient.setQueriesData(
        {
          predicate: (query) => query.queryKey[4] === "billing-subscription",
        },
        data,
      );
    },
  });
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
      <label className="flex items-center gap-2">
        Billing cycle
        <select
          aria-label="Billing cycle"
          value={cycle}
          onChange={(event) => {
            setCycle(event.target.value);
          }}
        >
          <option>Monthly</option>
          <option>Annual</option>
        </select>
      </label>
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
            const targetPlanId = planId;
            confirm({
              title: "Acknowledge period-end downgrade?",
              actionLabel: "Downgrade plan",
              onConfirm: () => {
                downgrade.mutate(targetPlanId);
              },
            });
          }}
        >
          Downgrade at period end
        </Button>
        <Button
          type="button"
          onClick={() => {
            quote.mutate({
              targetPlanId: planId,
              billingCycle: cycle,
              purpose: "Downgrade",
            });
          }}
        >
          Preview scheduled change
        </Button>
      </div>
      {quote.data ? (
        <div role="status">
          Effective {quote.data.effectiveAt}; next charge {quote.data.nextRenewalTotal}{" "}
          {quote.data.currency}.{" "}
          {quote.data.requiresAcknowledgement
            ? `Limits exceeded: ${quote.data.exceededLimits.join(", ")}`
            : ""}
          <Button
            type="button"
            onClick={() => {
              schedule.mutate({
                quoteId: quote.data.quoteId,
                acknowledgeExceededLimits: true,
              });
            }}
          >
            Confirm change
          </Button>
        </div>
      ) : null}
      {dialog}
    </section>
  );
}
