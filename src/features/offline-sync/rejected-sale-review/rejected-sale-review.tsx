import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionManager } from "../../../shared/auth/session-manager";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

const origin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

export interface RejectedOfflineSale {
  id: string;
  clientSaleId: string;
  registerId: string;
  rejectionReason: string;
  traceId?: string | null;
  status: string;
  payloadHash: string;
}

async function fetchRejected(): Promise<RejectedOfflineSale[]> {
  const headers = new Headers({ Accept: "application/json" });
  const token = sessionManager.getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${origin}/api/v1/sync/rejected`, { headers });
  if (!response.ok) throw new Error("Failed to load rejected sales");
  const body: unknown = await response.json();
  return Array.isArray(body) ? (body as RejectedOfflineSale[]) : [];
}

export function RejectedSaleReview({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["offline", "rejected"],
    queryFn: fetchRejected,
    enabled: canManage,
  });

  const resolve = useMutation({
    mutationFn: async (input: {
      rejectedSaleId: string;
      resolution: "retryRelease" | "reconcileLinked";
      linkedReconciliationSaleId?: string;
      note?: string;
    }) => {
      const headers = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json",
      });
      const token = sessionManager.getAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(
        `${origin}/api/v1/sync/rejected/${input.rejectedSaleId}/resolve`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            resolution: input.resolution,
            linkedReconciliationSaleId: input.linkedReconciliationSaleId,
            note: input.note,
          }),
        },
      );
      if (!response.ok) throw new Error("Resolve failed");
    },
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
