import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithProviders } from "../../shared/test/render";
import { NotificationFeed } from "./feed/notification-feed";
import { NotificationPreferences } from "./preferences/preferences-form";

describe("notifications", () => {
  it("shows one response error for an unexpected preference matrix", async () => {
    server.use(
      http.get("*/api/v1/notification-preferences", () =>
        HttpResponse.json([
          { type: "unexpected", channel: "unexpected", isEnabled: true },
          { type: "unexpected", channel: "unexpected", isEnabled: false },
        ]),
      ),
    );

    renderWithProviders(<NotificationPreferences />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unable to display notification preferences/i);
    expect(alert).not.toHaveTextContent(/check these fields/i);
    expect(alert.querySelectorAll("li")).toHaveLength(1);
  });

  it("shows occurrence count and marks one then all as read", async () => {
    const user = userEvent.setup();
    const items = [
      {
        id: "b1111111-1111-4111-8111-111111111111",
        type: 0,
        channel: 0,
        title: "Sugar 1kg is below reorder",
        message: "Qty on hand is low.",
        occurrences: 2,
        isRead: false,
        lastRaisedAt: new Date().toISOString(),
      },
      {
        id: "b2222222-2222-4222-8222-222222222222",
        type: 2,
        channel: 0,
        title: "Batch near expiry",
        occurrences: 1,
        isRead: false,
        lastRaisedAt: new Date().toISOString(),
      },
    ];
    server.use(
      http.get("*/api/v1/notifications", () =>
        HttpResponse.json({ items, totalCount: items.length }),
      ),
      http.post("*/api/v1/notifications/:id/read", ({ params }) => {
        const item = items.find((row) => row.id === params["id"]);
        if (item) item.isRead = true;
        return HttpResponse.json(true);
      }),
      http.post("*/api/v1/notifications/read-all", () => {
        for (const item of items) item.isRead = true;
        return HttpResponse.json(1);
      }),
    );

    renderWithProviders(<NotificationFeed />);
    expect(await screen.findByText(/unread: 2/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/sugar 1kg is below reorder \(2\)/i)).toBeInTheDocument();
    const markReadButtons = screen.getAllByRole("button", { name: /mark read/i });
    const firstMarkRead = markReadButtons[0];
    if (!firstMarkRead) throw new Error("expected mark-read button");
    await user.click(firstMarkRead);
    await waitFor(() => {
      expect(screen.getByText(/unread: 1/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /mark all read/i }));
    await waitFor(() => {
      expect(screen.getByText(/unread: 0/i)).toBeInTheDocument();
    });
  });

  it("saves channel matrix including push preference flag", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v1/notification-preferences", () =>
        HttpResponse.json([
          { type: 0, channel: 0, isEnabled: true, threshold: 5 },
          { type: 0, channel: 2, isEnabled: false, threshold: 5 },
        ]),
      ),
      http.put("*/api/v1/notification-preferences", async ({ request }) => {
        const body = (await request.json()) as {
          preferences: Array<{ type: number; channel: number; isEnabled: boolean }>;
        };
        expect(body.preferences.find((row) => row.channel === 2)?.isEnabled).toBe(true);
        expect(body.preferences.find((row) => row.channel === 2)?.type).toBe(0);
        return HttpResponse.json(body.preferences);
      }),
    );

    renderWithProviders(<NotificationPreferences />);
    const push = await screen.findByLabelText(/^lowstock push$/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(push);
    await user.click(screen.getByRole("button", { name: /save preferences/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/preferences saved/i);
  });
});
