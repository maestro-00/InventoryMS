import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { RegistrationForm } from "../features/auth/registration-form";
import {
  PublicAuthLayout,
  RegisterLeftPanel,
} from "../features/marketing/layout/public-auth-layout";
import { useSession } from "../shared/auth/session-context";

export const Route = createFileRoute("/register")({
  beforeLoad: async ({ context }) => {
    await context.sessionManager.whenRestored();
    if (!context.sessionManager.getSnapshot()) return;
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
    throw redirect({ to: "/dashboard" });
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { manager } = useSession();

  return (
    <PublicAuthLayout
      leftContent={<RegisterLeftPanel />}
      rightContent={
        <>
          <h1 className="mb-1 text-2xl font-bold text-foreground">
            Create your business
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Start your 14-day Professional trial — no credit card needed.
          </p>
          <RegistrationForm
            onRegistered={(result) => {
              manager.setSession({
                userId: result.tenantId,
                tenantId: result.tenantId,
                role: "Owner",
                permissions: [
                  "Sell",
                  "Refund",
                  "Discount",
                  "VoidSale",
                  "ViewProfit",
                  "ManageStock",
                  "ManagePurchasing",
                  "ManagePricing",
                  "ManageUsers",
                  "ViewReports",
                  "ApproveAdjustments",
                ],
                locationScope: [],
                expiresAt: result.accessTokenExpiresAt,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
              });
              void navigate({ to: "/onboarding" });
            }}
          />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </>
      }
    />
  );
}
