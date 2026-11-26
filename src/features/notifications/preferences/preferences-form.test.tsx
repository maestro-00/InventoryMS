import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import { NotificationPreferences } from "./preferences-form";

describe("notification preferences", () => {
  it("seeds defaults when InventoryX returns an empty matrix, then saves edits", async () => {
    const user = userEvent.setup();
    let saved:
      | {
          preferences: Array<{
            type: number;
            channel: number;
            isEnabled: boolean;
            threshold?: number | null;
          }>;
        }
      | undefined;
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/notification-preferences", () => HttpResponse.json([])),
      http.put("*/api/v1/notification-preferences", async ({ request }) => {
        saved = (await request.json()) as typeof saved;
        return HttpResponse.json([
          { type: 0, channel: 0, isEnabled: true, threshold: 9 },
        ]);
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <NotificationPreferences />
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText(/^LowStock InApp$/i)).toBeChecked();
    const threshold = screen.getByLabelText(/LowStock InApp threshold/i);
    await user.clear(threshold);
    await user.type(threshold, "9");
    await user.click(screen.getByRole("button", { name: /save preferences/i }));
    await waitFor(() => {
      expect(
        saved?.preferences.some(
          (row) => row.type === 0 && row.channel === 0 && row.threshold === 9,
        ),
      ).toBe(true);
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/preferences saved/i);
  });

  it("hydrates server rows that include thresholds", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/notification-preferences", () =>
        HttpResponse.json([
          { type: 2, channel: 1, isEnabled: false, threshold: null },
          { type: 0, channel: 3, isEnabled: true, threshold: "3" },
        ]),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <NotificationPreferences />
      </QueryClientProvider>,
    );
    expect(await screen.findByLabelText(/^ExpiringStock Email$/i)).not.toBeChecked();
    expect(screen.getByLabelText(/LowStock Sms threshold/i)).toHaveValue("3");
  });
});
