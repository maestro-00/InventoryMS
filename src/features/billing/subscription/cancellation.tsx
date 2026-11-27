import { useMutation } from "@tanstack/react-query";
import {
  cancelSubscription,
  reactivateSubscription,
  useBillingSubscription,
  reverseSubscriptionChange,
} from "../api/billing-queries";
import { Button } from "../../../shared/ui/button";
import { useConfirmDialog } from "../../../shared/ui/use-confirm-dialog";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function CancellationPanel() {
  const { confirm, dialog } = useConfirmDialog();
  const subscription = useBillingSubscription();
  const cancel = useMutation({ mutationFn: cancelSubscription });
  const reactivate = useMutation({ mutationFn: reactivateSubscription });
  const reverse = useMutation({ mutationFn: reverseSubscriptionChange });
  const problem = toProblem(subscription.error ?? cancel.error ?? reactivate.error);

  return (
    <section aria-label="Cancellation" className="space-y-3">
      <h2>Cancel or reactivate</h2>
      {subscription.data?.purgeAt ? (
        <p>
          Retention purge at {subscription.data.purgeAt}. Retained data can be exported
          or reactivated; final deletion is never earlier than 90 days after paid access
          ends.
        </p>
      ) : null}
      {subscription.data?.scheduledChangeKind ? (
        <p role="status">
          Scheduled {subscription.data.scheduledChangeKind} effective{" "}
          {subscription.data.scheduledChangeEffectiveAt}.
        </p>
      ) : null}
      {problem ? <ProblemSummary problem={problem} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            confirm({
              title: "Cancel subscription at period end?",
              actionLabel: "Cancel subscription",
              onConfirm: () => {
                cancel.mutate();
              },
            });
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
        {subscription.data?.scheduledChangeId ? (
          <Button
            type="button"
            onClick={() => {
              const changeId = subscription.data.scheduledChangeId;
              if (changeId) reverse.mutate(changeId);
            }}
          >
            Reverse scheduled change
          </Button>
        ) : null}
      </div>
      {dialog}
    </section>
  );
}
