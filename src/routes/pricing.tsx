import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "../features/marketing/pricing/pricing-page";
import { useBillingPlans } from "../features/billing/api/billing-queries";

export const Route = createFileRoute("/pricing")({
  component: PricingRoutePage,
});

function PricingRoutePage() {
  const plans = useBillingPlans();
  return <PricingPage {...(plans.data ? { plans: plans.data } : {})} />;
}
