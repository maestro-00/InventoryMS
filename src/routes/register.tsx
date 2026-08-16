import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RegistrationForm } from "../features/auth/registration-form";
import { useSession } from "../shared/auth/session-context";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { manager } = useSession();

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6"
    >
      <h1 className="text-2xl font-semibold">Create a business</h1>
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
    </main>
  );
}
