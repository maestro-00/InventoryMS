import { Badge } from "../../shared/ui/badge";
import { LoadingState } from "../../shared/ui/states/ui-state";
import { formatOccurredAt } from "../../shared/utils/date-time";
import { useSubscription } from "./api/subscription-api";

const METRIC_LABELS: Record<string, string> = {
  salesThisMonth: "Sales this month",
  locations: "Locations",
  users: "Users",
  products: "Products",
  registers: "Registers",
};

export function TrialSummary() {
  const query = useSubscription();

  if (query.isPending) {
    return <LoadingState label="Loading your subscription" />;
  }

  if (query.isError) {
    return (
      <p role="status">
        Subscription details are not available for your role. Ask the business owner for
        plan and trial information.
      </p>
    );
  }

  const subscription = query.data;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="trial-heading">
      <h2 id="trial-heading" className="text-xl font-semibold">
        Plan and usage
      </h2>
      <p className="flex items-center gap-2">
        <span className="font-medium">{subscription.plan}</span>
        <Badge variant="secondary">{subscription.status}</Badge>
      </p>
      {subscription.trialEndsAt ? (
        <p>Trial ends {formatOccurredAt(subscription.trialEndsAt)}</p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {subscription.usage.map((usage) => (
          <li key={usage.metric}>
            {METRIC_LABELS[usage.metric] ?? usage.metric}:{" "}
            {usage.limit === null || usage.limit === undefined
              ? `${String(usage.used)} used (unlimited)`
              : `${String(usage.used)} of ${String(usage.limit)}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
