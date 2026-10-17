import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import {
  downgradePlan,
  upgradePlan,
  useBillingPlans,
  useBillingSubscription,
  type BillingPlan,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { UsageMeter } from "../../marketing/plans/usage-meter";
import { cn } from "@/shared/utils/cn";
import { PlanComparisonTable } from "./plan-comparison-table";
import {
  buildPlanFeatureBullets,
  formatPlanPrice,
  isContactSalesPlan,
  recommendedHighlightIndex,
  salesContactHref,
  sortPlansByRank,
} from "./plan-presentation";

export function PlanComparison() {
  const plans = useBillingPlans();
  const subscription = useBillingSubscription();
  const upgrade = useMutation({ mutationFn: upgradePlan });
  const downgrade = useMutation({ mutationFn: downgradePlan });
  const problem = toProblem(
    plans.error ?? subscription.error ?? upgrade.error ?? downgrade.error,
  );

  const currentPlanName = subscription.data?.plan ?? "";
  const planList = sortPlansByRank(plans.data ?? []);
  const highlightIndex = recommendedHighlightIndex(planList);

  function planRank(plan: BillingPlan): number {
    return plan.monthlyPrice ?? plan.annualPrice ?? 0;
  }

  function handlePlanAction(plan: BillingPlan) {
    const current = planList.find(
      (row) =>
        row.name === currentPlanName ||
        row.tier === currentPlanName ||
        row.id === currentPlanName,
    );
    const currentRank = current ? planRank(current) : 0;
    const targetRank = planRank(plan);
    if (targetRank < currentRank) {
      if (window.confirm("Downgrade takes effect at period end. Continue?")) {
        downgrade.mutate(plan.id);
      }
      return;
    }
    upgrade.mutate(plan.id);
  }

  return (
    <section aria-label="Plans" className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Plan & billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription, usage, and billing details.
        </p>
      </div>

      {subscription.data ? (
        <div className="rounded-lg bg-navy p-5 sm:p-6 md:p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Current plan
          </p>
          <div className="mt-1 flex flex-wrap items-end gap-2">
            <span className="text-2xl font-bold text-navy-foreground">
              {subscription.data.plan}
            </span>
            <span className="text-sm text-navy-foreground/70">
              · {subscription.data.status}
            </span>
          </div>
          {subscription.data.trialEndsAt ? (
            <p className="mt-1 text-xs text-navy-foreground/70">
              Trial ends {subscription.data.trialEndsAt}
            </p>
          ) : (
            <p className="mt-1 text-xs text-navy-foreground/70">
              Period ends {subscription.data.currentPeriodEnd}
            </p>
          )}
        </div>
      ) : null}

      {subscription.data?.usage.length ? (
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-5 text-base font-semibold text-foreground">
            Usage this billing period
          </h2>
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            {subscription.data.usage.map((row) => (
              <UsageMeter
                key={row.metric}
                label={row.metric}
                used={row.used}
                unlimited={row.limit == null}
                {...(row.limit != null ? { total: row.limit } : {})}
              />
            ))}
          </div>
        </div>
      ) : null}

      {problem ? <ProblemSummary problem={problem} /> : null}

      <div>
        <h2 className="mb-5 text-base font-semibold text-foreground">Change plan</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {planList.map((plan) => {
            const isCurrent =
              plan.name === currentPlanName ||
              plan.tier === currentPlanName ||
              plan.id === currentPlanName;
            const contactSales = isContactSalesPlan(plan);
            return (
              <article
                key={plan.id}
                aria-label={`Plan ${plan.name}`}
                className={cn(
                  "flex flex-col rounded-lg border p-5 sm:p-6",
                  isCurrent ? "border-primary bg-secondary" : "border-border bg-card",
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-base font-semibold",
                      isCurrent ? "text-secondary-foreground" : "text-foreground",
                    )}
                  >
                    {plan.name}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      Current
                    </span>
                  ) : null}
                </div>
                <div className="mb-5 flex items-end gap-1">
                  <span
                    className={cn(
                      "text-3xl font-bold",
                      isCurrent ? "text-secondary-foreground" : "text-foreground",
                    )}
                  >
                    {contactSales ? "Custom" : formatPlanPrice(plan, "monthly")}
                  </span>
                  {contactSales ? null : (
                    <span className="mb-1 text-xs text-muted-foreground">/ month</span>
                  )}
                </div>
                <ul className="mb-6 flex flex-1 flex-col gap-2.5">
                  {buildPlanFeatureBullets(plan).map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "size-[13px] shrink-0",
                          isCurrent ? "text-secondary-foreground" : "text-success",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "text-sm",
                          isCurrent ? "text-secondary-foreground" : "text-foreground",
                        )}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="rounded-md border border-primary py-2.5 text-center text-sm font-medium text-secondary-foreground">
                    Active plan
                  </div>
                ) : contactSales ? (
                  <a
                    href={salesContactHref()}
                    className="inline-flex min-h-touch items-center justify-center rounded-md border border-border py-2.5 text-center text-sm font-medium text-foreground hover:border-primary"
                  >
                    Contact sales to change
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={upgrade.isPending || downgrade.isPending}
                    onClick={() => {
                      handlePlanAction(plan);
                    }}
                  >
                    {upgrade.isPending || downgrade.isPending
                      ? "Updating…"
                      : `Switch to ${plan.name}`}
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {planList.length > 0 ? (
        <div>
          <h2 className="mb-5 text-base font-semibold text-foreground">
            Compare all features
          </h2>
          <PlanComparisonTable
            plans={planList}
            highlightIndex={Math.min(highlightIndex, Math.max(planList.length - 1, 0))}
          />
        </div>
      ) : null}
    </section>
  );
}
