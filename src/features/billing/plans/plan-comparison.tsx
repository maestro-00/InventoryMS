import { useMutation } from "@tanstack/react-query";
import {
  downgradePlan,
  upgradePlan,
  useBillingPlans,
  useBillingSubscription,
  type BillingPlan,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

function PlanCard({
  plan,
  current,
  onUpgrade,
  onDowngrade,
}: {
  plan: BillingPlan;
  current: string;
  onUpgrade: (planId: string) => void;
  onDowngrade: (planId: string) => void;
}) {
  const isCurrent =
    plan.name === current || plan.tier === current || plan.id === current;
  return (
    <article aria-label={`Plan ${plan.name}`} className="space-y-2">
      <h3>{plan.name}</h3>
      <p>Tier: {plan.tier}</p>
      {isCurrent ? <p>Current plan</p> : null}
      {!isCurrent ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              onUpgrade(plan.id);
            }}
          >
            Upgrade to {plan.name}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onDowngrade(plan.id);
            }}
          >
            Downgrade to {plan.name}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function PlanComparison() {
  const plans = useBillingPlans();
  const subscription = useBillingSubscription();
  const upgrade = useMutation({ mutationFn: upgradePlan });
  const downgrade = useMutation({ mutationFn: downgradePlan });
  const problem = toProblem(
    plans.error ?? subscription.error ?? upgrade.error ?? downgrade.error,
  );

  return (
    <section aria-label="Plans" className="space-y-4">
      <h2>Plans and usage</h2>
      {subscription.data ? (
        <p>
          Status {subscription.data.status}
          {subscription.data.trialEndsAt
            ? ` · trial ends ${subscription.data.trialEndsAt}`
            : null}
        </p>
      ) : null}
      {subscription.data?.usage.length ? (
        <ul>
          {subscription.data.usage.map((row) => (
            <li key={row.metric}>
              {row.metric}: {String(row.used)}
              {row.limit != null ? ` / ${String(row.limit)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}
      <div className="grid gap-4">
        {(plans.data ?? []).map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={subscription.data?.plan ?? ""}
            onUpgrade={(planId) => {
              upgrade.mutate(planId);
            }}
            onDowngrade={(planId) => {
              if (window.confirm("Downgrade takes effect at period end. Continue?")) {
                downgrade.mutate(planId);
              }
            }}
          />
        ))}
      </div>
    </section>
  );
}
