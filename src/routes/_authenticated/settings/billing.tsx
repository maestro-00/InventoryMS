import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlanComparison } from "../../../features/billing/plans/plan-comparison";
import { CancellationPanel } from "../../../features/billing/subscription/cancellation";
import { ChangePlanForm } from "../../../features/billing/subscription/change-plan";
import { PaymentMethodForm } from "../../../features/billing/payment-method/payment-method-form";
import {
  DataExportPanel,
  InvoiceHistory,
  RecoveryPanel,
} from "../../../features/billing/invoices/invoice-history";
import { usePaymentIntentStatus } from "../../../features/billing/api/billing-queries";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { uuidSchema } from "../../../shared/api/client/boundary-schema";
import { useSession } from "../../../shared/auth/session-context";

export const Route = createFileRoute("/_authenticated/settings/billing")({
  component: BillingSettingsPage,
});

function BillingSettingsPage() {
  const { session } = useSession();
  if (session?.role !== "Owner")
    return (
      <main className="p-4">
        <h1>Billing access</h1>
        <p>Only business owners can manage billing.</p>
      </main>
    );
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4">
      <h1>Billing and data control</h1>
      <PaymentReturnStatus />
      <PlanComparison />
      <ChangePlanForm />
      <PaymentMethodForm />
      <RecoveryPanel />
      <CancellationPanel />
      <InvoiceHistory />
      <DataExportPanel />
    </main>
  );
}

export function PaymentReturnStatus() {
  const [intentId] = useState(() => {
    const saved = sessionStorage.getItem("billing-payment-intent");
    return saved && uuidSchema.safeParse(saved).success ? saved : null;
  });
  const status = usePaymentIntentStatus(intentId);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (status.data?.status !== "succeeded") return;
    sessionStorage.removeItem("billing-payment-intent");
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[4] === "billing-subscription" ||
        query.queryKey[4] === "billing-methods" ||
        query.queryKey[4] === "billing-invoices",
    });
  }, [status.data?.status, queryClient]);
  if (!intentId) return null;
  const problem = toProblem(status.error);
  return (
    <section
      aria-label="Payment status"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2 className="font-semibold">Payment status</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      {status.data?.status === "succeeded" ? (
        <p role="status">Payment confirmed.</p>
      ) : status.data?.status === "failed" ? (
        <p role="alert">Payment failed. Choose a plan and request a new quote.</p>
      ) : (
        <p role="status">
          Waiting for payment confirmation. Your plan will update after the provider
          confirms payment.
        </p>
      )}
    </section>
  );
}
