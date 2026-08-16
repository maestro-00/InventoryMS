import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RejectedSaleReview } from "../../../features/offline-sync/rejected-sale-review/rejected-sale-review";
import { StockConflictReview } from "../../../features/offline-sync/stock-conflict-review/stock-conflict-review";
import { OfflineStatusPanel } from "../../../features/offline-sync/offline-status";
import { listPendingSales } from "../../../features/offline-sync/offline-sale-repository";
import { setPendingSaleCount } from "../../../features/offline-sync/pending-sale-count-store";
import { useOnlineStatus } from "../../../shared/hooks/use-online-status";
import { usePwa } from "../../../app/providers/pwa-provider";
import { useSession } from "../../../shared/auth/session-context";
import { fetchRegisters } from "../../../features/registers/registers/api/registers-api";
import { useLocations } from "../../../features/inventory/locations/api/location-queries";

export const Route = createFileRoute("/_authenticated/offline/review")({
  component: OfflineReviewPage,
});

function OfflineReviewPage() {
  const session = useSession();
  const pwa = usePwa();
  const isOnline = useOnlineStatus();
  const locations = useLocations();
  const locationId = locations.data?.[0]?.id ?? "";
  const registers = useQuery({
    queryKey: ["registers", locationId],
    queryFn: () => fetchRegisters(locationId),
    enabled: locationId !== "",
  });
  const registerId = registers.data?.[0]?.id ?? null;
  const canManage =
    session.session?.role === "Owner" ||
    session.session?.role === "Administrator" ||
    session.session?.role === "Manager";

  const pending = useQuery({
    queryKey: ["offline", "pending-count", session.session?.tenantId, registerId],
    queryFn: async () => {
      if (!session.session?.tenantId || !registerId) return 0;
      const sales = await listPendingSales(session.session.tenantId, registerId);
      setPendingSaleCount(sales.length);
      return sales.length;
    },
    enabled: Boolean(session.session?.tenantId && registerId),
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4">
      <h1>Offline review</h1>
      <OfflineStatusPanel
        pendingCount={pending.data ?? 0}
        deadline={null}
        liveOnlyDisabled={!isOnline}
        updateWaiting={pwa.waiting}
        onApplyUpdate={pwa.applyUpdate}
      />
      <StockConflictReview />
      <RejectedSaleReview canManage={canManage} />
    </main>
  );
}
