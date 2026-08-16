import { createFileRoute } from "@tanstack/react-router";
import { TwoFactorSettings } from "../../../features/settings/security/two-factor";

export const Route = createFileRoute("/_authenticated/settings/security")({
  component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <h1>Security settings</h1>
      <TwoFactorSettings />
    </main>
  );
}
