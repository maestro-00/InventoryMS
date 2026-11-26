import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../../reports/api/reports-api";
import {
  notificationChannelName,
  notificationTypeName,
  notificationTypeNames,
} from "../../reports/api/notification-enums";
import { Button } from "../../../shared/ui/button";
import { ProblemSummary, toProblem } from "../../../shared/ui/forms/problem-summary";

type PreferenceRow = {
  type: number;
  channel: number;
  isEnabled: boolean;
  threshold?: string;
};

function rowsFromServer(
  data: Array<{
    type: number;
    channel: number;
    isEnabled: boolean;
    threshold?: string | null | undefined;
  }>,
): PreferenceRow[] {
  if (data.length) {
    return data.map((row) => {
      const next: PreferenceRow = {
        type: row.type,
        channel: row.channel,
        isEnabled: row.isEnabled,
      };
      if (row.threshold != null) next.threshold = row.threshold;
      return next;
    });
  }
  return notificationTypeNames.flatMap((_, type) =>
    [0, 1, 2, 3].map((channel) => {
      const next: PreferenceRow = {
        type,
        channel,
        isEnabled: channel === 0,
      };
      if (type === 0) next.threshold = "5";
      return next;
    }),
  );
}

export function NotificationPreferences() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: fetchNotificationPreferences,
  });
  const [matrix, setMatrix] = useState<PreferenceRow[]>([]);
  const [syncedData, setSyncedData] = useState(query.data);

  if (query.data !== undefined && query.data !== syncedData) {
    setSyncedData(query.data);
    setMatrix(rowsFromServer(query.data));
  }

  const save = useMutation({
    mutationFn: () =>
      updateNotificationPreferences(
        matrix.map((row) => ({
          type: row.type,
          channel: row.channel,
          isEnabled: row.isEnabled,
          ...(row.threshold ? { threshold: Number(row.threshold) } : {}),
        })),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  const problem = toProblem(query.error ?? save.error);

  return (
    <section aria-label="Notification preferences" className="space-y-4">
      <h2>Preferences</h2>
      <p>
        Cycle 1 persists the Push preference flag only; InventoryX owns push delivery.
      </p>
      {problem ? <ProblemSummary problem={problem} /> : null}
      <table>
        <caption>Channel matrix</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Channel</th>
            <th scope="col">Enabled</th>
            <th scope="col">Threshold</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, index) => (
            <tr key={`${String(row.type)}-${String(row.channel)}`}>
              <td>{notificationTypeName(row.type)}</td>
              <td>{notificationChannelName(row.channel)}</td>
              <td>
                <input
                  type="checkbox"
                  aria-label={`${notificationTypeName(row.type)} ${notificationChannelName(row.channel)}`}
                  checked={row.isEnabled}
                  onChange={(event) => {
                    setMatrix((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, isEnabled: event.target.checked }
                          : item,
                      ),
                    );
                  }}
                />
              </td>
              <td>
                <input
                  aria-label={`${notificationTypeName(row.type)} ${notificationChannelName(row.channel)} threshold`}
                  value={row.threshold ?? ""}
                  onChange={(event) => {
                    setMatrix((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, threshold: event.target.value }
                          : item,
                      ),
                    );
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        type="button"
        onClick={() => {
          save.mutate();
        }}
        disabled={save.isPending}
      >
        Save preferences
      </Button>
      {save.isSuccess ? <p role="status">Preferences saved.</p> : null}
    </section>
  );
}
