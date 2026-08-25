import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSession } from "../../shared/auth/session-context";
import { useActiveLocationId } from "../../shared/location/use-active-location";
import { AfterSalePanel } from "../../features/pos/after-sale/after-sale-panel";
import { fetchProducts } from "../../features/catalogue/products/api/products-api";
import {
  fetchOpenShifts,
  fetchRegisters,
} from "../../features/registers/registers/api/registers-api";

export const Route = createFileRoute("/_authenticated/returns")({
  beforeLoad: ({ context }) => {
    if (!context.session?.permissions.includes("Sell")) {
      throw new Error("Returns require Sell permission");
    }
  },
  component: ReturnsPage,
});

function ReturnsPage() {
  const { session } = useSession();
  const locationId = useActiveLocationId();
  const registers = useQuery({
    queryKey: ["registers", locationId],
    queryFn: () => fetchRegisters(locationId),
    enabled: locationId !== "",
  });
  const openShifts = useQuery({
    queryKey: ["shifts", "open"],
    queryFn: () => fetchOpenShifts(),
  });
  const products = useQuery({
    queryKey: ["products", "returns"],
    queryFn: () => fetchProducts({ pageSize: 200 }),
  });

  const locationRegisterIds = useMemo(
    () => new Set((registers.data ?? []).map((register) => register.id)),
    [registers.data],
  );
  const shift =
    openShifts.data?.find((entry) => locationRegisterIds.has(entry.registerId)) ??
    null;
  const registerId = shift?.registerId ?? "";

  if (!session) return null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Returns</h1>
      <p className="text-sm text-muted-foreground">
        Look up a receipt to return, exchange, or void a sale. Live connection required.
      </p>
      {shift && registerId ? (
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
