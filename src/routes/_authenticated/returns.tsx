import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../shared/auth/session-context";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import { AfterSalePanel } from "../../features/pos/after-sale/after-sale-panel";
import { fetchProducts } from "../../features/catalogue/products/api/products-api";
import { useLocations } from "../../features/inventory/locations/api/location-queries";
import { useOpenShifts } from "../../features/registers/shifts/use-open-shifts";

export const Route = createFileRoute("/_authenticated/returns")({
  beforeLoad: ({ context }) => {
    if (!context.session?.permissions.includes("Sell")) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ReturnsPage,
});

function ReturnsPage() {
  const { session } = useSession();
  const locations = useLocations();
  const locationId = useActiveLocationId();
  const { entries: openShiftEntries, isPending: openShiftsPending } = useOpenShifts({
    enabled: locationId !== "",
    locationId,
  });
  const products = useQuery({
    queryKey: ["products", "returns"],
    queryFn: () => fetchProducts({ pageSize: 200 }),
  });

  const entry = openShiftEntries[0];
  const shift = entry?.shift ?? null;
  const registerId = shift?.registerId ?? "";
  // Disabled useOpenShifts is not pending — wait for locations (and shifts once enabled).
  const loadingContext =
    locations.isPending || (locationId !== "" && openShiftsPending);

  if (!session) return null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Returns</h1>
      <p className="text-sm text-muted-foreground">
        Look up a receipt to return, exchange, or void a sale. Live connection required.
      </p>
      {loadingContext ? (
        <p>Loading open shifts…</p>
      ) : shift && registerId ? (
        <AfterSalePanel
          registerId={registerId}
          shiftId={shift.id}
          products={products.data?.items ?? []}
        />
      ) : (
        <p>Open a shift on a till at this location before processing returns.</p>
      )}
    </main>
  );
}
