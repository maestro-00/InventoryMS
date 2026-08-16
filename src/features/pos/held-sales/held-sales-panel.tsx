import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import type { ProductRecord } from "../../catalogue/products/api/products-api";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import type { SaleRecord } from "../sales/api/sales-api";
import { fetchHeldSale, fetchHeldSales } from "./api/held-sales-api";
import { detectHeldSaleDrift } from "./held-sale-drift";

export function HeldSalesPanel({
  products,
  stockByProduct,
  onRecall,
}: {
  products: ProductRecord[];
  stockByProduct: Map<string, string>;
  onRecall: (sale: SaleRecord) => void;
}) {
  const held = useQuery({
    queryKey: ["held-sales"],
    queryFn: fetchHeldSales,
  });
  const recall = useMutation({
    mutationFn: (id: string) => fetchHeldSale(id),
    onSuccess: (sale) => {
      onRecall(sale);
    },
  });

  if (held.isPending) return <LoadingState label="Loading held sales" />;
  if (held.isError) return <ProblemSummary problem={toProblem(held.error)} />;

  const recalling = recall.data;
  const drift = recalling
    ? detectHeldSaleDrift({ held: recalling, products, stockByProduct })
    : [];

  return (
    <section className="flex flex-col gap-3" aria-label="Held sales">
      <h2 className="text-lg font-semibold">Held sales</h2>
      {held.data.length === 0 ? <p>No held sales.</p> : null}
      <ul className="flex flex-col gap-2">
        {held.data.map((sale) => (
          <li key={sale.id} className="flex items-center justify-between gap-2">
            <span>
              Held {formatGhanaMoney(sale.grandTotal)} · {sale.lines.length} lines
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                recall.mutate(sale.id);
              }}
            >
              Recall held sale
            </Button>
          </li>
        ))}
      </ul>
      {drift.some((item) => item.kind === "price") ? (
        <p role="status">The catalogue price has changed since this sale was held.</p>
      ) : null}
      {drift
        .filter((item) => item.kind !== "price")
        .map((item) => (
          <p key={`${item.kind}-${item.productName}`} role="status">
            {item.detail}
          </p>
        ))}
    </section>
  );
}
