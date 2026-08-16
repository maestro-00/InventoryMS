import { createFileRoute } from "@tanstack/react-router";
import { OnboardingChecklist } from "../../features/onboarding/onboarding-checklist";
import { SampleDataActions } from "../../features/onboarding/sample-data-actions";
import { TrialSummary } from "../../features/onboarding/trial-summary";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Set up your business</h1>
      <OnboardingChecklist />
      <TrialSummary />
      <SampleDataActions />
    </div>
  );
}
