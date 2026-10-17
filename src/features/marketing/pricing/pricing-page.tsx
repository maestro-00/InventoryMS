import type { BillingPlan } from "../../billing/api/plan-schema";
import { PlanComparisonTable } from "../../billing/plans/plan-comparison-table";
import {
  buildPlanFeatureBullets,
  formatPlanPrice,
  partitionPlansForMarketing,
  recommendedPlanIndex,
  salesContactHref,
  type BillingCycle,
} from "../../billing/plans/plan-presentation";
import { PRICING_FAQ } from "../shared/marketing-content";
import { MarketingShell } from "../layout/marketing-shell";
import { PricingCard } from "./pricing-card";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/cn";
import {
  MarketingAtmosphere,
  MarketingDisplayHeading,
  MarketingEyebrow,
} from "../shared/marketing-ui";

export function PricingPage({
  plans,
  isLoading = false,
  isError = false,
  onRetry,
}: {
  plans?: BillingPlan[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const { selfServe, contact } = partitionPlansForMarketing(plans ?? []);
  const highlightIndex = recommendedPlanIndex(selfServe);

  return (
    <MarketingShell activePage="pricing">
      <MarketingAtmosphere
        backgroundImage="/images/marketing/pricing-header.webp"
        imagePosition="center 46%"
        imageClassName="saturate-50"
        overlayClassName="bg-navy/90"
        className="px-4 py-10 text-center sm:py-16 md:px-16 md:pt-20"
      >
        <div className="mx-auto max-w-2xl">
          <MarketingEyebrow className="mx-auto flex justify-center">
            Pricing
          </MarketingEyebrow>
          <MarketingDisplayHeading className="mb-4 text-4xl text-navy-foreground sm:mb-5 sm:text-5xl">
            Simple, predictable pricing
          </MarketingDisplayHeading>
          <p className="marketing-animate-in marketing-delay-2 mb-6 text-base text-navy-foreground/70 sm:mb-8 sm:text-lg">
            14-day Professional trial · No credit card required
          </p>
          <div
            className="marketing-animate-in marketing-delay-3 inline-flex w-full max-w-xs items-center gap-1 rounded-full border border-navy-light/60 bg-navy-light/50 p-1 backdrop-blur-sm sm:w-auto"
            role="group"
            aria-label="Billing cycle"
          >
            <button
              type="button"
              className={cn(
                "min-h-touch flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all sm:flex-none sm:px-5 sm:py-1.5",
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-navy-foreground/70 hover:text-navy-foreground",
              )}
              onClick={() => {
                setBillingCycle("monthly");
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              className={cn(
                "min-h-touch flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all sm:flex-none sm:px-5 sm:py-1.5",
                billingCycle === "annual"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-navy-foreground/70 hover:text-navy-foreground",
              )}
              onClick={() => {
                setBillingCycle("annual");
              }}
            >
              Annual{" "}
              <span
                className={cn(
                  "ml-1 text-xs font-semibold",
                  billingCycle === "annual"
                    ? "rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-primary-foreground"
                    : "text-success",
                )}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </MarketingAtmosphere>

      <section className="bg-background px-4 py-10 sm:py-16 md:px-16">
        {isLoading ? <PricingSkeleton /> : null}
        {isError ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
            <p role="alert" className="text-sm text-muted-foreground">
              Pricing is unavailable right now. Try again to load current plans.
            </p>
            {onRetry ? (
              <Button type="button" variant="outline" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        ) : null}
        {!isLoading && !isError && selfServe.length === 0 ? (
          <p role="status" className="text-center text-sm text-muted-foreground">
            Plans are not published yet.
          </p>
        ) : null}
        {!isLoading && !isError && selfServe.length > 0 ? (
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
              {selfServe.map((plan, index) => (
                <PricingCard
                  key={plan.id}
                  plan={plan.name}
                  price={formatPlanPrice(plan, billingCycle)}
                  period={billingCycle === "annual" ? "/ year" : "/ month"}
                  description={`${plan.tier} plan for your business`}
                  features={buildPlanFeatureBullets(plan)}
                  cta="Start free trial"
                  highlighted={index === highlightIndex}
                  badge={index === highlightIndex ? "Most popular" : ""}
                />
              ))}
            </div>
            {contact ? (
              <PricingCard
                plan={contact.name}
                price="Custom"
                period=""
                description="For larger operations that need a tailored rollout and dedicated support."
                features={buildPlanFeatureBullets(contact)}
                cta="Contact sales"
                ctaHref={salesContactHref()}
              />
            ) : null}
          </div>
        ) : null}
      </section>

      {!isLoading && !isError && selfServe.length > 0 ? (
        <section className="border-t border-border px-4 py-10 sm:py-16 md:px-16">
          <MarketingDisplayHeading
            as="h2"
            className="mb-6 text-center text-2xl text-foreground sm:mb-10 sm:text-3xl"
          >
            Compare plans
          </MarketingDisplayHeading>
          <div className="mx-auto max-w-4xl">
            <PlanComparisonTable plans={selfServe} highlightIndex={highlightIndex} />
            {contact ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Need {contact.name}?{" "}
                <a
                  href={salesContactHref()}
                  className="font-medium text-primary hover:underline"
                >
                  Contact sales
                </a>{" "}
                for a custom plan.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="bg-muted/50 px-4 py-10 sm:py-16 md:px-16">
        <MarketingDisplayHeading
          as="h2"
          className="mb-6 text-center text-2xl text-foreground sm:mb-10 sm:text-3xl"
        >
          Frequently asked questions
        </MarketingDisplayHeading>
        <div className="mx-auto grid max-w-4xl gap-4 sm:gap-6 md:grid-cols-2">
          {PRICING_FAQ.map((item) => (
            <article
              key={item.q}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/20"
            >
              <h3 className="mb-2 text-base font-semibold text-foreground">{item.q}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}

function PricingSkeleton() {
  return (
    <div
      className="mx-auto flex max-w-5xl flex-col gap-10"
      aria-busy="true"
      aria-label="Loading plans"
    >
      <div className="grid gap-6 md:grid-cols-3">
        {["a", "b", "c"].map((slot) => (
          <div
            key={slot}
            className="h-80 animate-pulse rounded-xl border border-border bg-muted"
          />
        ))}
      </div>
      <div className="flex flex-col gap-3" aria-label="Loading plan comparison">
        {["r1", "r2", "r3", "r4"].map((slot) => (
          <div key={slot} className="h-12 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
