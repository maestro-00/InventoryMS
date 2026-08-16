import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { Button } from "../../../shared/ui/button";
import { TextField } from "../../../shared/ui/forms/form-field";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import { useState } from "react";

export interface ConflictedSale {
  id: string;
  clientSaleId: string;
  stockConflictFlag: boolean;
}

async function fetchConflicts(): Promise<ConflictedSale[]> {
  const { data, response } = await inventoryxClient.GET("/api/v1/sync/conflicts");
  if (!response.ok) throw new Error("Failed to load conflicts");
  return Array.isArray(data) ? (data as ConflictedSale[]) : [];
}

export function StockConflictReview() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["offline", "conflicts"],
    queryFn: fetchConflicts,
  });
  const resolve = useMutation({
    mutationFn: async (input: {
      saleId: string;
      resolution: "acceptAsIs" | "adjustWithReason";
      reasonCode?: string;
    }) => {
      const { response } = await inventoryxClient.POST(
        "/api/v1/sync/conflicts/{saleId}/resolve",
        {
          params: { path: { saleId: input.saleId } },
          body: {
            resolution: input.resolution,
            reasonCode: input.reasonCode,
            adjustments:
              input.resolution === "adjustWithReason"
                ? [{ productId: crypto.randomUUID(), qtyDelta: 0 }]
                : [],
          } as never,
        },
      );
      if (!response.ok) throw new Error("Conflict resolve failed");
    },
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
                onClick={() => {
                  resolve.mutate({
                    saleId: sale.id,
                    resolution: "adjustWithReason",
                    reasonCode: reason || "Recount",
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
