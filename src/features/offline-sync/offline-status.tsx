import { listPendingSales } from "./offline-sale-repository";
import { shouldDeferServiceWorkerUpdate } from "../../shared/db/storage-pressure";

export async function loadOfflineStatus(input: {
  tenantId: string;
  registerId: string;
  hasActiveShift: boolean;
  deadline: string | null;
  liveOnlyDisabled?: boolean;
}): Promise<{
  pendingCount: number;
  deferUpdate: boolean;
  deadlinePassed: boolean;
  liveOnlyDisabled: boolean;
}> {
  const pending = await listPendingSales(input.tenantId, input.registerId);
  const deadlinePassed = input.deadline
    ? Date.now() >= Date.parse(input.deadline)
    : true;
  return {
    pendingCount: pending.length,
    deferUpdate: shouldDeferServiceWorkerUpdate({
      hasActiveShift: input.hasActiveShift,
      pendingOfflineSales: pending.length,
    }),
    deadlinePassed,
    liveOnlyDisabled: input.liveOnlyDisabled ?? true,
  };
}

export function OfflineStatusPanel(props: {
  pendingCount: number;
  deadline: string | null;
  liveOnlyDisabled: boolean;
  updateWaiting: boolean;
  onApplyUpdate: () => void;
}) {
  return (
    <section aria-label="Offline status" className="space-y-2" tabIndex={-1}>
      <h2>Offline status</h2>
      <p>{props.pendingCount} sale(s) waiting to sync.</p>
      {props.deadline ? <p>Readiness deadline: {props.deadline}</p> : null}
      {props.liveOnlyDisabled ? (
        <p>Live-only actions stay disabled while offline.</p>
      ) : null}
      {props.updateWaiting ? (
        <p>
          An app update is waiting. It stays deferred while a shift or queue is active.{" "}
          <button type="button" onClick={props.onApplyUpdate}>
            Apply update when idle
          </button>
        </p>
      ) : null}
    </section>
  );
}
