import { purchaseOrderPdfUrl, sendPurchaseOrder } from "../api/purchasing-api";
import { Button } from "../../../shared/ui/button";
import { useMutation } from "@tanstack/react-query";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function OrderDocument({ orderId }: { orderId: string }) {
  const send = useMutation({ mutationFn: () => sendPurchaseOrder(orderId) });
  const problem = toProblem(send.error);

  return (
    <section aria-label="Purchase order document" className="space-y-2">
      <h3>PO document</h3>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <div className="flex flex-wrap gap-2">
        <a href={purchaseOrderPdfUrl(orderId)}>Download PDF</a>
        <Button
          type="button"
          onClick={() => {
            send.mutate();
          }}
          disabled={send.isPending}
        >
          Email supplier
        </Button>
      </div>
      {send.isSuccess ? <p>Supplier email queued.</p> : null}
    </section>
  );
}
