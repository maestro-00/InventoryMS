import { createFileRoute } from "@tanstack/react-router";
import { PlanComparison } from "../../../features/billing/plans/plan-comparison";
import { CancellationPanel } from "../../../features/billing/subscription/cancellation";
import { PaymentMethodForm } from "../../../features/billing/payment-method/payment-method-form";
import {
  DataExportPanel,
  InvoiceHistory,
} from "../../../features/billing/invoices/invoice-history";

export const Route = createFileRoute("/_authenticated/settings/billing")({
  component: BillingSettingsPage,
});

function BillingSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4">
      <h1>Billing and data control</h1>
      <PlanComparison />
      <PaymentMethodForm />
      <CancellationPanel />
      <InvoiceHistory />
      <DataExportPanel />
    </main>
  );
}
