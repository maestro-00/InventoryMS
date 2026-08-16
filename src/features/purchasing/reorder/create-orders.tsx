import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchReorderSuggestions } from "../../inventory/alerts/api/alerts-api";
import { applyReorderSuggestions } from "../api/purchasing-api";
import { Button } from "../../../shared/ui/button";
import { SelectField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { formatGhanaMoney } from "../../../shared/money/decimal";

export function CreateOrdersFromReorder({
  locations,
}: {
  locations: Array<{ id: string; name: string }>;
}) {
  const queryClient = useQueryClient();
  const [locationId, setLocationId] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const effectiveLocationId = locationId || locations[0]?.id || "";

  const suggestions = useQuery({
    queryKey: ["reorder-suggestions", effectiveLocationId],
    queryFn: () => fetchReorderSuggestions(effectiveLocationId || undefined),
  });
  const apply = useMutation({
    mutationFn: applyReorderSuggestions,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["purchasing", "orders"] });
    },
  });
  const problem = toProblem(suggestions.error ?? apply.error);

  return (
    <section aria-label="Create orders from reorder" className="space-y-4">
      <h2>Reorder into draft POs</h2>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <SelectField
        label="Deliver to location"
        value={effectiveLocationId}
        options={locations.map((location) => ({
          value: location.id,
          label: location.name,
        }))}
        onChange={(event) => {
          setLocationId(event.target.value);
        }}
      />
      <ul className="space-y-2">
        {(suggestions.data ?? []).map((item) => {
          const supplierId = item.supplierId ?? "";
          const key = `${item.productId}:${supplierId}`;
          return (
            <li key={key}>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(selected[key])}
                  onChange={(event) => {
                    setSelected((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }));
                  }}
                />
                <span>
                  {item.productName} via {item.supplierName ?? "supplier"} · suggest{" "}
                  {item.suggestedQty} @ {formatGhanaMoney(item.unitCost)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button
        type="button"
        disabled={apply.isPending || !effectiveLocationId}
        onClick={() => {
          const selections = (suggestions.data ?? []).flatMap((item) => {
            if (!item.supplierId) return [];
            const key = `${item.productId}:${item.supplierId}`;
            if (!selected[key]) return [];
            return [
              {
                productId: item.productId,
                supplierId: item.supplierId,
                qty: Number(item.suggestedQty),
                unitCost: Number(item.unitCost),
              },
            ];
          });
          apply.mutate({ deliverToLocationId: effectiveLocationId, selections });
        }}
      >
        Create draft orders
      </Button>
      {apply.data?.length ? (
        <p>{apply.data.length} draft purchase order(s) created.</p>
      ) : null}
    </section>
  );
}
