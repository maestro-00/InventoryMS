import type { OnboardingChecklist } from "../tenant/api/tenant-api";

export const BUSINESS_PROFILE_STEP = "businessProfile";
export const LOCATION_STEP = "location";
export const PRODUCT_STEP = "product";
export const OPENING_STOCK_STEP = "openingStock";
export const REGISTER_STEP = "register";
export const FIRST_SALE_STEP = "firstSale";

export const ONBOARDING_STEP_KEYS = [
  BUSINESS_PROFILE_STEP,
  LOCATION_STEP,
  PRODUCT_STEP,
  OPENING_STOCK_STEP,
  REGISTER_STEP,
  FIRST_SALE_STEP,
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

/**
 * Returns the checklist to persist once a step is finished, or null when the tenant
 * record already records it so no needless tenant write is issued.
 */
export function checklistAfterStep(
  checklist: OnboardingChecklist,
  step: string,
): OnboardingChecklist | null {
  if (checklist[step] === true) return null;
  return { ...checklist, [step]: true };
}
