import { createFileRoute, redirect } from "@tanstack/react-router";
import { LandingPage } from "../features/marketing/landing/landing-page";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    await context.sessionManager.whenRestored();
    if (context.sessionManager.getSnapshot()) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LandingPage,
});
