import { Link } from "@tanstack/react-router";
import type { BatchRecord } from "./api/batches-api";
import { filterBatchesByExpiryHorizon } from "./api/batches-api";

export function ExpiryAlerts({
  batches,
  horizonDays,
  onHorizonChange,
}: {
  batches: BatchRecord[];
  horizonDays: number;
  onHorizonChange: (days: number) => void;
}) {
  const expiring = filterBatchesByExpiryHorizon(batches, horizonDays);
  return (
    <section aria-label="Expiry alerts" className="space-y-3">
      <h2>Expiry horizon</h2>
      <label>
        Days
        <select
          aria-label="Expiry horizon days"
          value={horizonDays}
          onChange={(event) => {
            onHorizonChange(Number(event.target.value));
          }}
        >
          <option value={7}>7</option>
          <option value={30}>30</option>
          <option value={90}>90</option>
        </select>
      </label>
      <ul>
        {expiring.map((batch) => (
          <li key={batch.id}>
            <Link to="/inventory/batches" search={{ batchId: batch.id }}>
              {batch.batchNumber} expires {batch.expiresAt}
            </Link>
          </li>
        ))}
      </ul>
      {expiring.length === 0 ? <p>No batches in this horizon.</p> : null}
    </section>
  );
}
