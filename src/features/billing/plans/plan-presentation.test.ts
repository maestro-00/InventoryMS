import { describe, expect, it } from "vitest";
import { billingPlansFixture } from "../../../../tests/fixtures/billing-plans";
import { normalizeBillingPlan, planSchema, type BillingPlan } from "../api/plan-schema";
import {
  buildComparisonRows,
  buildPlanFeatureBullets,
  formatPlanPrice,
  isContactSalesPlan,
  partitionPlansForMarketing,
  recommendedHighlightIndex,
  recommendedPlanIndex,
  sortPlansByRank,
} from "./plan-presentation";

function fixturePlan(index: number): BillingPlan {
  const plan = billingPlansFixture[index];
  if (!plan) throw new Error(`Missing billing plan fixture at index ${String(index)}`);
  return plan;
}

describe("plan presentation", () => {
  it("sorts priced self-serve plans first and unpriced contact-sales last", () => {
    const shuffled = [
      billingPlansFixture[2],
      billingPlansFixture[0],
      billingPlansFixture[3],
      billingPlansFixture[1],
    ] as BillingPlan[];
    expect(sortPlansByRank(shuffled).map((plan) => plan.name)).toEqual([
      "Free",
      "Standard",
      "Professional",
      "Business",
    ]);
  });

  it("keeps zero-priced contact-sales after Free", () => {
    const businessAtZero: BillingPlan = {
      ...fixturePlan(3),
      monthlyPrice: 0,
      annualPrice: 0,
    };
    expect(
      sortPlansByRank([businessAtZero, fixturePlan(0)]).map((plan) => plan.name),
    ).toEqual(["Free", "Business"]);
  });

  it("treats Business as contact sales and keeps Free self-serve", () => {
    expect(isContactSalesPlan(fixturePlan(0))).toBe(false);
    expect(isContactSalesPlan(fixturePlan(3))).toBe(true);

    const { selfServe, contact } = partitionPlansForMarketing(billingPlansFixture);
    expect(selfServe.map((plan) => plan.name)).toEqual([
      "Free",
      "Standard",
      "Professional",
    ]);
    expect(contact?.name).toBe("Business");
  });

  it("uses the highest-priced plan as contact when four unnamed tiers arrive", () => {
    const unnamed: BillingPlan[] = billingPlansFixture.map((plan, index) => ({
      ...plan,
      name: `Tier ${String(index + 1)}`,
      tier: `Tier ${String(index + 1)}`,
      monthlyPrice: (index + 1) * 100,
      annualPrice: (index + 1) * 960,
    }));
    const { selfServe, contact } = partitionPlansForMarketing(unnamed);
    expect(selfServe).toHaveLength(3);
    expect(contact?.id).toBe("plan-business");
  });

  it("recommends Standard or Professional on the self-serve row", () => {
    const { selfServe } = partitionPlansForMarketing(billingPlansFixture);
    expect(selfServe[recommendedPlanIndex(selfServe)]?.name).toBe("Standard");
  });

  it("maps the self-serve recommendation onto the full four-plan list", () => {
    const planList = sortPlansByRank(billingPlansFixture);
    const highlightIndex = recommendedHighlightIndex(planList);
    expect(planList[highlightIndex]?.name).toBe("Standard");
    expect(planList[highlightIndex]?.name).not.toBe("Free");

    const unsorted = [fixturePlan(3), fixturePlan(0), fixturePlan(1), fixturePlan(2)];
    const naiveIndex = recommendedPlanIndex(
      unsorted.filter((plan) => !isContactSalesPlan(plan)),
    );
    expect(unsorted[naiveIndex]?.name).toBe("Free");
    expect(unsorted[recommendedHighlightIndex(unsorted)]?.name).toBe("Standard");
  });

  it("formats prices and feature bullets from DTO limits", () => {
    const standard = fixturePlan(1);
    expect(formatPlanPrice(standard, "monthly")).toBe("GHS 249");
    expect(formatPlanPrice(standard, "annual")).toBe("GHS 2,390");
    expect(buildPlanFeatureBullets(standard)).toEqual(
      expect.arrayContaining([
        "Up to 3 locations",
        "Up to 5000 products",
        "Offline POS",
        "Purchasing",
      ]),
    );
  });

  it("normalizes null API name and tier to empty strings", () => {
    const dto = planSchema.parse({
      id: "plan-null",
      name: null,
      tier: null,
    });
    expect(normalizeBillingPlan(dto)).toMatchObject({
      id: "plan-null",
      name: "",
      tier: "",
    });
  });

  it("builds comparison rows from limits and feature flags", () => {
    const { selfServe } = partitionPlansForMarketing(billingPlansFixture);
    const rows = buildComparisonRows(selfServe);
    const locations = rows.find((row) => row.feature === "Locations");
    expect(locations?.values).toEqual(["1", "3", "Unlimited"]);
    const offline = rows.find((row) => row.feature === "Offline POS");
    expect(offline?.values).toEqual(["—", "✓", "✓"]);
  });
});
