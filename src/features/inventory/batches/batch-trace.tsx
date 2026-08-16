import { useQuery } from "@tanstack/react-query";
import { fetchBatchTrace } from "./api/batches-api";

export function BatchTrace({ batchId }: { batchId: string }) {
  const query = useQuery({
    queryKey: ["batch-trace", batchId],
    queryFn: () => fetchBatchTrace(batchId),
    enabled: Boolean(batchId),
  });

  if (!batchId) return <p>Select a batch to trace.</p>;
  if (query.isError) return <p role="alert">Failed to load batch trace.</p>;
  if (!query.data) return <p>Loading trace…</p>;

  return (
    <section aria-label="Batch recall trace" className="space-y-3">
      <h2>Recall trace</h2>
      <p>
        Batch {query.data.batchNumber}
        {query.data.supplier ? ` from ${query.data.supplier.name}` : ""}
      </p>
      <h3>Receipts</h3>
      <ul>
        {query.data.receipts.map((receipt) => (
          <li key={receipt.id}>
            {receipt.receiptNumber} · qty {receipt.quantity} · damaged{" "}
            {receipt.damagedQuantity}
          </li>
        ))}
      </ul>
      <table>
        <caption>Affected sales</caption>
        <thead>
          <tr>
            <th scope="col">Sale</th>
            <th scope="col">When</th>
            <th scope="col">Qty</th>
          </tr>
        </thead>
        <tbody>
          {query.data.sales.map((sale) => (
            <tr key={sale.id}>
              <td>{sale.id}</td>
              <td>{sale.occurredAt}</td>
              <td>{sale.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
