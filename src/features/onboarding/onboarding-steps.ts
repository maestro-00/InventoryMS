export interface OnboardingStep {
  key: string;
  label: string;
  description: string;
  to: string;
}

/** The resumable first-sale journey; order matches the order an owner must complete it. */
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    key: "businessProfile",
    label: "Confirm business profile",
    description: "Set the trading name, contact details, and valuation method.",
    to: "/settings/business",
  },
  {
    key: "location",
    label: "Create the first location",
    description: "Stock, registers, and sales all belong to a location.",
    to: "/locations",
  },
  {
    key: "product",
    label: "Add the first product",
    description: "Create a product manually or import a spreadsheet.",
    to: "/catalogue/products",
  },
  {
    key: "openingStock",
    label: "What's on the shelf",
    description: "Set the quantity you already hold at each location.",
    to: "/inventory/opening-stock",
  },
  {
    key: "register",
    label: "Create a register",
    description: "A register is the till a cashier sells from.",
    to: "/registers",
  },
  {
    key: "firstSale",
    label: "Complete the first sale",
    description: "Open a shift with a counted float and sell an item.",
    to: "/pos",
  },
];

export function completedCount(checklist: Record<string, boolean>): number {
  return ONBOARDING_STEPS.filter((step) => checklist[step.key] === true).length;
}

export function isOnboardingComplete(checklist: Record<string, boolean>): boolean {
  return completedCount(checklist) === ONBOARDING_STEPS.length;
}
