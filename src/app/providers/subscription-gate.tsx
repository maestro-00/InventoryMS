import { Link } from "@tanstack/react-router";
import { createContext, useContext, type ReactNode } from "react";
import { useBillingSubscription } from "../../features/billing/api/billing-queries";

export interface SubscriptionGateValue {
  readOnly: boolean;
  status: string | null;
}

const SubscriptionGateContext = createContext<SubscriptionGateValue>({
  readOnly: false,
  status: null,
});

export function SubscriptionGateProvider({ children }: { children: ReactNode }) {
  const subscription = useBillingSubscription();
  const status = subscription.data?.status ?? null;
  const readOnly =
    Boolean(subscription.data?.readOnly) ||
    status === "PastDue" ||
    status === "ReadOnly" ||
    status === "Grace";

  return (
    <SubscriptionGateContext.Provider value={{ readOnly, status }}>
      {children}
    </SubscriptionGateContext.Provider>
  );
}

/**
 * Rendered inside the authenticated layout rather than beside the provider: the billing
 * link has to be a client-side route change, which needs the router above it.
 */
export function SubscriptionBanner() {
  const { readOnly, status } = useSubscriptionGate();
  if (!readOnly) return null;

  return (
    <div role="status" className="border-b border-amber-700 bg-amber-50 p-3 text-sm">
      Subscription is read-only ({status}). You can still open billing, invoices, and
      data export. <Link to="/settings/billing">Manage billing</Link>
    </div>
  );
}

export function useSubscriptionGate(): SubscriptionGateValue {
  return useContext(SubscriptionGateContext);
}
