import { useQuery } from "@tanstack/react-query";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { fetchReorderSuggestions } from "../alerts/api/alerts-api";

export function ReorderSuggestions({ locationId }: { locationId?: string }) {
  const suggestions = useQuery({
    queryKey: ["reorder-suggestions", locationId],
    queryFn: () => fetchReorderSuggestions(locationId),
  });

  if (suggestions.isPending)
    return <LoadingState label="Loading reorder suggestions" />;
  if (suggestions.isError) {
    return <ProblemSummary problem={toProblem(suggestions.error)} />;
  }

  const bySupplier = new Map<string, typeof suggestions.data>();
  for (const item of suggestions.data) {
    const key = item.supplierName ?? "Unassigned supplier";
    const current = bySupplier.get(key) ?? [];
    current.push(item);
    bySupplier.set(key, current);
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Reorder suggestions">
      <p className="text-sm text-muted-foreground">
        Review only. Creating purchase orders from these suggestions is part of
        purchasing (US7).
      </p>
      {[...bySupplier.entries()].map(([supplier, items]) => (
        <div key={supplier}>
          <h2 className="text-lg font-semibold">{supplier}</h2>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.productId} className="rounded-md border p-3">
                <p>
                  {item.productName}
                  {item.sku ? ` (${item.sku})` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  On hand {item.currentStock} · reorder at {item.reorderPoint} · suggest{" "}
                  {item.suggestedQty} @ {formatGhanaMoney(item.unitCost)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {suggestions.data.length === 0 ? <p>No reorder suggestions.</p> : null}
    </section>
  );
}
