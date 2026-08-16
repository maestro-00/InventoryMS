import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import { StaffList } from "./staff-list";

const roleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("staff list", () => {
  it("invites a user, then deactivates and scopes an existing account", async () => {
    const user = userEvent.setup();
    let invited: unknown;
    const updated: unknown[] = [];
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/users", () =>
        HttpResponse.json([
          {
            id: userId,
            email: "cashier@kwame.gh",
            name: "Cashier",
            roleId,
            locationScope: null,
            status: "Active",
            isOwner: false,
          },
        ]),
      ),
      http.get("*/api/v1/roles", () =>
        HttpResponse.json([
          {
            id: roleId,
            name: "Cashier",
            permissions: "Sell",
            maxDiscountPercent: 5,
            maxUnauthorizedRefundAmount: 20,
          },
        ]),
      ),
      http.post("*/api/v1/users/invitations", async ({ request }) => {
        invited = await request.json();
        return HttpResponse.json({
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          token: "tok",
        });
      }),
      http.patch("*/api/v1/users/:id", async ({ request }) => {
        updated.push(await request.json());
        return HttpResponse.json(true);
      }),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <StaffList />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/cashier@kwame.gh/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/invite email/i), "new@kwame.gh");
    await user.selectOptions(screen.getByLabelText(/^role$/i), roleId);
    await user.type(
      screen.getByLabelText(/location scope/i),
      "55555555-5555-4555-8555-555555555555",
    );
    await user.click(screen.getByRole("button", { name: /send invitation/i }));
    await waitFor(() => {
      expect(invited).toMatchObject({
        email: "new@kwame.gh",
        roleId,
        locationScope: "55555555-5555-4555-8555-555555555555",
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/invitation token/i);

    await user.click(screen.getByRole("button", { name: /deactivate/i }));
    await user.click(screen.getByRole("button", { name: /scope to main shop/i }));
    await waitFor(() => {
      expect(updated).toEqual(
        expect.arrayContaining([
          { status: "Inactive" },
          { locationScope: "33333333-3333-4333-8333-333333333333" },
        ]),
      );
    });
    confirm.mockRestore();
  });

  it("respects a declined deactivate confirmation", async () => {
    const user = userEvent.setup();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    let patched = 0;
    server.use(
      http.get("*/api/v1/users", () =>
        HttpResponse.json([
          {
            id: userId,
            email: "cashier@kwame.gh",
            status: "Active",
            roleId: null,
            locationScope: "all-locations",
          },
        ]),
      ),
      http.get("*/api/v1/roles", () => HttpResponse.json([])),
      http.patch("*/api/v1/users/:id", () => {
        patched += 1;
        return HttpResponse.json(true);
      }),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <StaffList />
      </QueryClientProvider>,
    );
    await screen.findByText(/cashier@kwame.gh/i);
    await user.click(screen.getByRole("button", { name: /deactivate/i }));
    expect(patched).toBe(0);
    confirm.mockRestore();
  });
});
