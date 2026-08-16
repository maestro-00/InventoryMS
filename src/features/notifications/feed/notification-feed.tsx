import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../reports/api/reports-api";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

export function NotificationFeed() {
  const queryClient = useQueryClient();
  const feed = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
  });
  const readOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const unread = (feed.data?.items ?? []).filter((item) => !item.isRead).length;
  const problem = toProblem(feed.error ?? readOne.error ?? readAll.error);

  return (
    <section aria-label="Notifications" className="space-y-4">
      <h2>Notification feed</h2>
      <p>Unread: {unread}</p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <Button
        type="button"
        onClick={() => {
          readAll.mutate();
        }}
        disabled={readAll.isPending}
      >
        Mark all read
      </Button>
      <ul className="space-y-2">
        {(feed.data?.items ?? []).map((item) => (
          <li key={item.id}>
            <p>
              {item.title}
              {item.occurrences > 1 ? ` (${String(item.occurrences)})` : ""} ·{" "}
              {item.isRead ? "Read" : "Unread"}
            </p>
            {item.message ? <p>{item.message}</p> : null}
            {!item.isRead ? (
              <Button
                type="button"
                onClick={() => {
                  readOne.mutate(item.id);
                }}
              >
                Mark read
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
