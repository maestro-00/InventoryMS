import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BatchList } from "../../../../features/inventory/batches/batch-list";
import { ExpiryAlerts } from "../../../../features/inventory/batches/expiry-alerts";
import { BatchTrace } from "../../../../features/inventory/batches/batch-trace";
import { fetchProductBatches } from "../../../../features/inventory/batches/api/batches-api";

const DEFAULT_PRODUCT = "44444444-4444-4444-8444-444444444444";

type BatchesSearch = { batchId?: string };

export const Route = createFileRoute("/_authenticated/inventory/batches/")({
  validateSearch: (search: Record<string, unknown>): BatchesSearch => {
    const next: BatchesSearch = {};
    if (typeof search.batchId === "string") next.batchId = search.batchId;
    return next;
  },
  component: BatchesPage,
});

function BatchesPage() {
  const search = Route.useSearch();
  const [horizonDays, setHorizonDays] = useState(30);
  const [selectedBatchId, setSelectedBatchId] = useState(search.batchId ?? "");
  const batches = useQuery({
    queryKey: ["batches", DEFAULT_PRODUCT],
    queryFn: () => fetchProductBatches(DEFAULT_PRODUCT),
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4">
      <h1>Batches</h1>
      <ExpiryAlerts
        batches={batches.data ?? []}
        horizonDays={horizonDays}
        onHorizonChange={setHorizonDays}
      />
      <BatchList
        batches={(batches.data ?? []).map((batch) => {
          const row: {
            id: string;
            batchNumber: string;
            qty: string;
            expiresAt?: string | null;
          } = {
            id: batch.id,
            batchNumber: batch.batchNumber,
            qty: batch.qty,
          };
          if (batch.expiresAt !== undefined) row.expiresAt = batch.expiresAt;
          return row;
        })}
      />
      <label>
        Trace batch
        <select
          aria-label="Trace batch"
          value={selectedBatchId}
          onChange={(event) => {
            setSelectedBatchId(event.target.value);
          }}
        >
          <option value="">Select…</option>
          {(batches.data ?? []).map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.batchNumber}
            </option>
          ))}
        </select>
      </label>
      {selectedBatchId ? <BatchTrace batchId={selectedBatchId} /> : null}
    </main>
  );
}
