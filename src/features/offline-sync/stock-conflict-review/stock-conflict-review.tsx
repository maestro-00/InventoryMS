import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  fetchSyncConflicts,
  resolveSyncConflict,
  type ConflictedSale,
} from "../api/sync-api";

export type { ConflictedSale };

export function StockConflictReview() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["offline", "conflicts"],
    queryFn: fetchSyncConflicts,
  });
  const resolve = useMutation({
    mutationFn: resolveSyncConflict,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["offline", "conflicts"] });
    },
  });

  const problem = toProblem(query.error ?? resolve.error);

  return (
    <section aria-label="Stock conflict review" className="space-y-4">
      <h2>Stock conflicts</h2>
      <p>
        Choose accept as-is or adjust with a reason. InventoryX remains authoritative.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <TextField
        label="Adjustment reason"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
        }}
      />
      <ul className="space-y-3">
        {(query.data ?? []).map((sale) => (
          <li key={sale.id}>
            <article className="flex flex-wrap gap-2">
              <p>{sale.clientSaleId}</p>
              <Button
                type="button"
                onClick={() => {
                  resolve.mutate({ saleId: sale.id, resolution: "acceptAsIs" });
                }}
              >
                Accept as-is
              </Button>
              <Button
                type="button"
                disabled={sale.lines.length === 0 || reason.trim() === ""}
                title={
                  sale.lines.length === 0
                    ? "Adjustment lines are not available for this conflict"
                    : undefined
                }
                onClick={() => {
                  resolve.mutate({
                    saleId: sale.id,
                    resolution: "adjustWithReason",
                    reasonCode: reason.trim(),
                    adjustments: sale.lines.map((line) => ({
                      productId: line.productId,
                      qtyDelta: 0,
                    })),
                  });
                }}
              >
                Adjust with reason
              </Button>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
