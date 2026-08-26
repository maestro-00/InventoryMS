import { createFileRoute, redirect } from "@tanstack/react-router";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import { SaleHistory } from "../../features/pos/sales/sale-history";

export const Route = createFileRoute("/_authenticated/sales")({
  beforeLoad: ({ context }) => {
    const permissions = context.session?.permissions ?? [];
    if (
      !permissions.includes("Sell") &&
      !permissions.includes("ViewReports") &&
      context.session?.role !== "Owner" &&
      context.session?.role !== "Administrator" &&
      context.session?.role !== "Manager"
    ) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SalesPage,
});

function SalesPage() {
  const locationId = useActiveLocationId();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Sales history</h1>
      <SaleHistory locationId={locationId} />
    </main>
  );
}
