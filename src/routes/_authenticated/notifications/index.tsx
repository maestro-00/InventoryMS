import { createFileRoute } from "@tanstack/react-router";
import { NotificationFeed } from "../../../features/notifications/feed/notification-feed";
import { NotificationPreferences } from "../../../features/notifications/preferences/preferences-form";

export const Route = createFileRoute("/_authenticated/notifications/")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4">
      <h1>Notifications</h1>
      <NotificationFeed />
      <NotificationPreferences />
    </main>
  );
}
