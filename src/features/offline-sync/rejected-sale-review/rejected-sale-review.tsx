import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";
import {
  fetchRejectedOfflineSales,
  resolveRejectedOfflineSale,
  type RejectedOfflineSale,
} from "../api/sync-api";

export type { RejectedOfflineSale };

export function RejectedSaleReview({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["offline", "rejected"],
    queryFn: fetchRejectedOfflineSales,
    enabled: canManage,
  });

  const resolve = useMutation({
    mutationFn: resolveRejectedOfflineSale,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["offline", "rejected"] });
    },
  });

  if (!canManage) {
    return <p>Only a manager can review rejected offline sales.</p>;
  }

  const problem = toProblem(query.error ?? resolve.error);

  return (
    <section aria-label="Rejected offline sales" className="space-y-4">
      <h2>Rejected offline sales</h2>
      <p>
        Original payloads stay immutable. Release for retry or link a reconciliation
        sale.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      {query.isLoading ? <p>Loading rejected sales…</p> : null}
      <ul className="space-y-3">
        {(query.data ?? []).map((sale) => (
          <li key={sale.id}>
            <article className="space-y-2">
              <h3>{sale.clientSaleId}</h3>
              <p>{sale.rejectionReason}</p>
              {sale.traceId ? <p>Support ref: {sale.traceId}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    resolve.mutate({
                      rejectedSaleId: sale.id,
                      resolution: "retryRelease",
                      note: "Cause resolved",
                    });
                  }}
                >
                  Release for retry
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
