import { useMutation } from "@tanstack/react-query";
import {
  cancelSubscription,
  reactivateSubscription,
  useBillingSubscription,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function CancellationPanel() {
  const subscription = useBillingSubscription();
  const cancel = useMutation({ mutationFn: cancelSubscription });
  const reactivate = useMutation({ mutationFn: reactivateSubscription });
  const problem = toProblem(subscription.error ?? cancel.error ?? reactivate.error);

  return (
    <section aria-label="Cancellation" className="space-y-3">
      <h2>Cancel or reactivate</h2>
      <p>
        Cancellation keeps read-only access until the retention purge date. Export your
        data before purge.
      </p>
      {subscription.data?.purgeAt ? (
        <p>Retention purge at {subscription.data.purgeAt}</p>
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            if (window.confirm("Cancel subscription at period end?")) {
              cancel.mutate();
            }
          }}
        >
          Cancel subscription
        </Button>
        <Button
          type="button"
          onClick={() => {
            reactivate.mutate();
          }}
        >
          Reactivate
        </Button>
      </div>
    </section>
  );
}
