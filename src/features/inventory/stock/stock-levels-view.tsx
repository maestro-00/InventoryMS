import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSession } from "../../../shared/auth/session-context";
import { hasPermission } from "../../../shared/auth/access-policy";
import { formatGhanaMoney } from "../../../shared/money/decimal";
import { Button } from "../../../shared/ui/button";
import { SelectField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { LoadingState } from "../../../shared/ui/states/ui-state";
import { useLocations } from "../locations/api/location-queries";
import { fetchStockLevels } from "./api/stock-api";

export function StockLevelsView() {
  const { session } = useSession();
  const canViewProfit = hasPermission(session, "ViewProfit");
  const locations = useLocations();
  const [locationId, setLocationId] = useState("");
  const [groupByProduct, setGroupByProduct] = useState(false);
  const [belowReorder, setBelowReorder] = useState(false);

  const visibleLocations = useMemo(() => {
    const all = locations.data ?? [];
    const scope = session?.locationScope ?? [];
    if (scope.length === 0) return all;
    return all.filter((location) => scope.includes(location.id));
  }, [locations.data, session?.locationScope]);

  const stock = useQuery({
    queryKey: ["stock-levels", locationId, groupByProduct, belowReorder],
    queryFn: () =>
      fetchStockLevels({
        ...(locationId ? { locationId } : {}),
        ...(groupByProduct ? { groupBy: "product" } : {}),
        ...(belowReorder ? { belowReorder: true } : {}),
        pageSize: 100,
      }),
  });

  if (locations.isPending || stock.isPending) {
    return <LoadingState label="Loading stock" />;
  }
  if (locations.isError) return <ProblemSummary problem={toProblem(locations.error)} />;
  if (stock.isError) return <ProblemSummary problem={toProblem(stock.error)} />;

  return (
    <section className="flex flex-col gap-4" aria-label="Stock levels">
      <div className="flex flex-wrap gap-3">
        <SelectField
          label="Location"
          value={locationId}
          options={[
            { value: "", label: "All visible locations" },
            ...visibleLocations.map((location) => ({
              value: location.id,
              label: location.name,
            })),
          ]}
          onChange={(event) => {
            setLocationId(event.target.value);
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={groupByProduct}
            onChange={(event) => {
              setGroupByProduct(event.target.checked);
            }}
          />
          Business-wide rollup
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={belowReorder}
            onChange={(event) => {
              setBelowReorder(event.target.checked);
            }}
          />
          Below reorder only
        </label>
      </div>
      <div
        className="overflow-x-auto"
        role="region"
        aria-label="Stock levels table"
        // Scrollable region must accept keyboard focus (WCAG 2.1.1 / axe scrollable-region-focusable).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- intentional keyboard scroll target
        tabIndex={0}
      >
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Location</th>
              <th scope="col">On hand</th>
              <th scope="col">In transit</th>
              <th scope="col">Quarantine</th>
              {canViewProfit ? <th scope="col">Avg unit cost</th> : null}
            </tr>
          </thead>
          <tbody>
            {stock.data.items.map((row) => (
              <tr
                key={`${row.productId}-${row.locationId ?? "all"}-${row.batchId ?? ""}`}
              >
                <td>{row.productName ?? row.productId}</td>
                <td>{row.locationId ?? "All locations"}</td>
                <td>{row.qtyOnHand}</td>
                <td>{row.qtyInTransit}</td>
                <td>{row.qtyQuarantine}</td>
                {canViewProfit ? (
                  <td>
                    {row.avgUnitCost != null ? formatGhanaMoney(row.avgUnitCost) : "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!canViewProfit ? (
        <p className="text-sm text-muted-foreground">
          Cost and valuation fields are hidden without ViewProfit.
        </p>
      ) : null}
      <Button type="button" variant="outline" disabled>
        Thresholds are provider-defined and read-only in this build
      </Button>
    </section>
  );
}
