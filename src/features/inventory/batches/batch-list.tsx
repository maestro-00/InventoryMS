export function BatchList({
  batches,
}: {
  batches: Array<{
    id: string;
    batchNumber: string;
    qty: string;
    expiresAt?: string | null;
  }>;
}) {
  const ordered = [...batches].sort((a, b) =>
    (a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""),
  );
  return (
    <section aria-label="Batches">
      <h2>Batches (FEFO order)</h2>
      <ol>
        {ordered.map((batch) => (
          <li key={batch.id}>
            {batch.batchNumber} · {batch.qty} · {batch.expiresAt ?? "no expiry"}
          </li>
        ))}
      </ol>
    </section>
  );
}
