import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "../features/marketing/pricing/pricing-page";
import {
  billingPlansQueryKey,
  fetchPlans,
  useBillingPlans,
} from "../features/billing/api/billing-queries";

export const Route = createFileRoute("/pricing")({
  loader: async ({ context }) => {
    try {
      const plans = await context.queryClient.ensureQueryData({
        queryKey: billingPlansQueryKey,
        queryFn: fetchPlans,
      });
      return { plans, failed: false };
    } catch {
      return { plans: undefined, failed: true };
    }
  },
  component: PricingRoutePage,
});

function PricingRoutePage() {
  const loader = Route.useLoaderData();
  const query = useBillingPlans();
  const plans = query.data ?? loader.plans;
  const isLoading = query.isPending && !plans;
  const isError = (query.isError || loader.failed) && !plans;

  return (
    <PricingPage
      {...(plans ? { plans } : {})}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => {
        void query.refetch();
      }}
    />
  );
}
