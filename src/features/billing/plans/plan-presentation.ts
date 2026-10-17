import type { BillingPlan } from "../api/plan-schema";

export const CONTACT_SALES_TIERS = ["business", "enterprise"] as const;

export const FEATURE_LABELS: Record<string, string> = {
  offlinePos: "Offline POS",
  purchasing: "Purchasing",
  advancedReports: "Advanced reports",
  prioritySupport: "Priority support",
  staffRoles: "Staff roles",
  dedicatedSupport: "Dedicated support",
};

export const LIMIT_LABELS = {
  maxLocations: "Locations",
  maxProducts: "Products",
  maxUsers: "Staff users",
  maxRegisters: "Registers",
  monthlySaleCap: "Sales per month",
} as const;

export type BillingCycle = "monthly" | "annual";

export type PlanComparisonRow = {
  feature: string;
  values: string[];
};

export type MarketingPlanPartition = {
  selfServe: BillingPlan[];
  contact: BillingPlan | undefined;
};

const LIMIT_KEYS = Object.keys(LIMIT_LABELS) as Array<keyof typeof LIMIT_LABELS>;

let warnedAmbiguousContactFallback = false;

function warnAmbiguousContactFallback(): void {
  if (!import.meta.env.DEV || warnedAmbiguousContactFallback) return;
  warnedAmbiguousContactFallback = true;
  console.warn(
    "partitionPlansForMarketing: no CONTACT_SALES_TIERS match among 4+ plans; using highest published price as contact-sales.",
  );
}

function planPrice(plan: BillingPlan): number {
  return plan.monthlyPrice ?? plan.annualPrice ?? 0;
}

function hasPublishedPrice(plan: BillingPlan): boolean {
  return plan.monthlyPrice !== undefined || plan.annualPrice !== undefined;
}

/** Unpriced / zero-priced contact-sales sorts last; Free at 0 stays self-serve. */
function planSortRank(plan: BillingPlan): number {
  if (isContactSalesPlan(plan) && planPrice(plan) === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return planPrice(plan);
}

function matchesContactTier(plan: BillingPlan): boolean {
  const names = [plan.tier, plan.name].map((value) => value.trim().toLowerCase());
  return CONTACT_SALES_TIERS.some((tier) => names.includes(tier));
}

export function isContactSalesPlan(plan: BillingPlan): boolean {
  return matchesContactTier(plan) || !hasPublishedPrice(plan);
}

export function sortPlansByRank(plans: BillingPlan[]): BillingPlan[] {
  return [...plans].sort((left, right) => {
    const priceDelta = planSortRank(left) - planSortRank(right);
    if (priceDelta !== 0) return priceDelta;
    return left.tier.localeCompare(right.tier);
  });
}

export function partitionPlansForMarketing(
  plans: BillingPlan[],
): MarketingPlanPartition {
  const sorted = sortPlansByRank(plans);
  const namedContact = [...sorted].reverse().find((plan) => isContactSalesPlan(plan));
  const usedPriceFallback = namedContact === undefined && sorted.length >= 4;
  if (usedPriceFallback && !sorted.some((plan) => matchesContactTier(plan))) {
    warnAmbiguousContactFallback();
  }
  const contact =
    namedContact ?? (usedPriceFallback ? sorted[sorted.length - 1] : undefined);
  const remaining = contact ? sorted.filter((plan) => plan.id !== contact.id) : sorted;
  return {
    selfServe: remaining.slice(0, 3),
    contact,
  };
}

export function recommendedPlanIndex(plans: BillingPlan[]): number {
  const named = plans.findIndex(
    (plan) =>
      /^(standard|professional)$/i.test(plan.tier) ||
      /^(standard|professional)$/i.test(plan.name),
  );
  if (named >= 0) return named;
  if (plans.length >= 3) return 1;
  return Math.max(0, Math.floor(plans.length / 2));
}

/** Map the self-serve recommendation onto `plans` (the array passed to the table). */
export function recommendedHighlightIndex(plans: BillingPlan[]): number {
  if (plans.length === 0) return 0;
  const selfServe = plans.filter((plan) => !isContactSalesPlan(plan));
  const source = selfServe.length > 0 ? selfServe : plans;
  const recommended = source[recommendedPlanIndex(source)];
  if (!recommended) return 0;
  const index = plans.findIndex((plan) => plan.id === recommended.id);
  return index >= 0 ? index : 0;
}

export function formatPlanPrice(plan: BillingPlan, cycle: BillingCycle): string {
  const raw =
    cycle === "annual"
      ? (plan.annualPrice ?? plan.monthlyPrice)
      : (plan.monthlyPrice ?? plan.annualPrice);
  if (raw == null) return "—";
  return `GHS ${raw.toLocaleString("en-GH", { maximumFractionDigits: 0 })}`;
}

function humanizeFeatureKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatLimitValue(value: number | null | undefined): string {
  if (value === undefined) return "—";
  if (value === null) return "Unlimited";
  return String(value);
}

export function buildPlanFeatureBullets(plan: BillingPlan): string[] {
  const bullets: string[] = [];
  for (const key of LIMIT_KEYS) {
    const value = plan[key];
    if (value === undefined) continue;
    const label = LIMIT_LABELS[key].toLowerCase();
    bullets.push(
      value == null ? `Unlimited ${label}` : `Up to ${String(value)} ${label}`,
    );
  }
  for (const [key, enabled] of Object.entries(plan.features ?? {})) {
    if (!enabled) continue;
    bullets.push(FEATURE_LABELS[key] ?? humanizeFeatureKey(key));
  }
  return bullets.length > 0 ? bullets : [`${plan.name} tier`];
}

export function buildComparisonRows(plans: BillingPlan[]): PlanComparisonRow[] {
  const rows: PlanComparisonRow[] = [];
  for (const key of LIMIT_KEYS) {
    if (!plans.some((plan) => plan[key] !== undefined)) continue;
    rows.push({
      feature: LIMIT_LABELS[key],
      values: plans.map((plan) => formatLimitValue(plan[key])),
    });
  }

  const featureKeys = new Set<string>();
  for (const plan of plans) {
    for (const key of Object.keys(plan.features ?? {})) {
      featureKeys.add(key);
    }
  }
  for (const key of featureKeys) {
    rows.push({
      feature: FEATURE_LABELS[key] ?? humanizeFeatureKey(key),
      values: plans.map((plan) => (plan.features?.[key] ? "✓" : "—")),
    });
  }
  return rows;
}

export function salesContactHref(): string {
  const email = import.meta.env.VITE_SALES_EMAIL ?? "sales@inventoryms.app";
  return `mailto:${email}`;
}

export function salesContactEmail(): string {
  return import.meta.env.VITE_SALES_EMAIL ?? "sales@inventoryms.app";
}
