import { createFileRoute } from "@tanstack/react-router";
import { ReceiptTemplateSettings } from "../../../features/pos/receipts/receipt-template";

export const Route = createFileRoute("/_authenticated/settings/receipts")({
  component: ReceiptSettingsPage,
});

function ReceiptSettingsPage() {
  return <ReceiptTemplateSettings />;
}
