import { createFileRoute } from "@tanstack/react-router";
import { BusinessSettings } from "../../../features/settings/business/business-settings";

export const Route = createFileRoute("/_authenticated/settings/business")({
  component: BusinessSettingsPage,
});

function BusinessSettingsPage() {
  return <BusinessSettings />;
}
