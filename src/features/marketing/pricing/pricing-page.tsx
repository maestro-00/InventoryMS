import type { BillingPlan } from "../../billing/api/billing-queries";
import { PRICING_COMPARISON_ROWS, PRICING_FAQ } from "../shared/marketing-content";
import { MarketingShell } from "../layout/marketing-shell";
import { PricingCard } from "./pricing-card";
import { PricingComparisonMobile } from "./pricing-comparison-mobile";
import { useState } from "react";
import { cn } from "@/shared/utils/cn";
import {
  MarketingAtmosphere,
  MarketingDisplayHeading,
  MarketingEyebrow,
} from "../shared/marketing-ui";

const FALLBACK_PLANS = [
  {
    plan: "Free",
    price: "GHS 0",
    description: "For single-location shops getting started",
    features: ["1 location", "500 products", "Basic POS", "Email support"],
    highlighted: false,
    badge: "",
  },
  {
    plan: "Standard",
    price: "GHS 249",
    description: "For growing retailers with multiple locations",
    features: [
      "3 locations",
      "5,000 products",
      "Offline POS",
      "Purchasing & reports",
      "Priority support",
    ],
    highlighted: true,
    badge: "Most popular",
  },
  {
    plan: "Professional",
    price: "GHS 499",
    description: "For larger operations needing advanced control",
    features: [
      "Unlimited locations",
      "Unlimited products",
      "Advanced reports",
      "Staff roles",
      "Dedicated support",
    ],
    highlighted: false,
    badge: "",
  },
] as const;

function formatPlanPrice(plan: BillingPlan, cycle: "monthly" | "annual"): string {
  const raw =
    cycle === "annual"
      ? (plan.annualPrice ?? plan.monthlyPrice)
      : (plan.monthlyPrice ?? plan.annualPrice);
  if (raw == null) return "—";
  const amount = typeof raw === "number" ? raw : Number.parseFloat(raw);
  if (Number.isNaN(amount)) return String(raw);
  return `GHS ${amount.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
}

function planFeatures(plan: BillingPlan): string[] {
  const limits = plan.limits ?? {};
  const entries = Object.entries(limits).slice(0, 5);
  if (entries.length === 0) {
    return [`${plan.name} tier`, `${plan.tier} plan features`];
  }
  return entries.map(([key, value]) =>
    value == null ? `Unlimited ${key}` : `Up to ${value} ${key}`,
  );
}

export function PricingPage({ plans }: { plans?: BillingPlan[] }) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const displayPlans =
    plans && plans.length >= 3
      ? plans.slice(0, 3).map((plan, index) => ({
          plan: plan.name,
          price: formatPlanPrice(plan, billingCycle),
          description: `${plan.tier} plan for your business`,
          features: planFeatures(plan),
          highlighted: index === 1,
          badge: index === 1 ? "Most popular" : "",
        }))
      : FALLBACK_PLANS.map((plan) => ({
          ...plan,
          price: plan.price,
        }));

  return (
    <MarketingShell activePage="pricing">
      <MarketingAtmosphere className="px-4 py-10 text-center sm:py-16 md:px-16 md:pt-20">
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
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 md:items-stretch">
          {displayPlans.map((plan) => (
            <PricingCard
              key={plan.plan}
              plan={plan.plan}
              price={plan.price}
              period={billingCycle === "annual" ? "/ year" : "/ month"}
              description={plan.description}
              features={[...plan.features]}
              cta="Start free trial"
              highlighted={plan.highlighted}
              badge={plan.badge}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-border px-4 py-10 sm:py-16 md:px-16">
        <MarketingDisplayHeading
          as="h2"
          className="mb-6 text-center text-2xl text-foreground sm:mb-10 sm:text-3xl"
        >
          Compare plans
        </MarketingDisplayHeading>
        <div className="mx-auto max-w-4xl">
          <PricingComparisonMobile />
          <div className="hidden overflow-x-auto md:block">
            <div className="grid min-w-[640px] grid-cols-4 overflow-hidden rounded-xl border border-border shadow-sm">
              <div className="bg-muted p-5 text-sm font-semibold text-muted-foreground">
                Feature
              </div>
              {["Starter", "Professional", "Business"].map((tier) => (
                <div
                  key={tier}
                  className={cn(
                    "bg-muted p-5 text-center text-sm font-semibold",
                    tier === "Professional" ? "text-primary" : "text-foreground",
                  )}
                >
                  {tier}
                </div>
              ))}
              {PRICING_COMPARISON_ROWS.map((row, index) => (
                <div key={row.feature} className="contents">
                  <div
                    className={
                      index % 2 === 0
                        ? "border-t border-border bg-background p-4 text-sm text-foreground"
                        : "border-t border-border bg-muted/50 p-4 text-sm text-foreground"
                    }
                  >
                    {row.feature}
                  </div>
                  {[row.starter, row.professional, row.business].map(
                    (cell, cellIndex) => (
                      <div
                        key={`${row.feature}-${cellIndex}`}
                        className={cn(
                          "border-t border-border p-4 text-center text-sm",
                          index % 2 === 0 ? "bg-background" : "bg-muted/50",
                          cellIndex === 1 ? "font-medium text-primary" : undefined,
                        )}
                      >
                        {cell}
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
