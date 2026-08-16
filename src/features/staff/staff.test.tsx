import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithProviders, ownerSessionRecord } from "../../shared/test/render";
import { StaffList } from "./users/staff-list";
import { RegisterPinForm } from "./register-pin/register-pin-form";
import { AuditLogPanel } from "./audit-log/audit-log-panel";
import { AcceptInvitationForm } from "./invitations/accept-invitation-form";
import { TwoFactorSettings } from "../settings/security/two-factor";

const ROLE_ID = "22222222-aaaa-4222-8222-222222222222";
const USER_ID = "c1111111-1111-4111-8111-111111111111";

function pageConfirm(result: boolean) {
  vi.stubGlobal(
    "confirm",
    vi.fn(() => result),
  );
}

describe("staff administration", () => {
  it("invites a cashier and shows role explanations", async () => {
    const user = userEvent.setup();
    const users = [
      {
        id: ownerSessionRecord.userId,
        email: "owner@kwame.gh",
        roleId: "11111111-aaaa-4111-8111-111111111111",
        locationScope: null,
        status: "Active",
        isOwner: true,
      },
    ];
    server.use(
      http.get("*/api/v1/users", () => HttpResponse.json(users)),
      http.get("*/api/v1/roles", () =>
        HttpResponse.json([
          {
            id: ROLE_ID,
            name: "Cashier",
            permissions: "Sell",
            maxDiscountPercent: 5,
          },
        ]),
      ),
      http.post("*/api/v1/users/invitations", async ({ request }) => {
        const body = (await request.json()) as { email: string };
        users.push({
          id: USER_ID,
          email: body.email,
          roleId: ROLE_ID,
          locationScope: null,
          status: "Invited",
          isOwner: false,
        });
        return HttpResponse.json({ id: USER_ID, token: "tok" }, { status: 201 });
      }),
    );

    renderWithProviders(<StaffList />);
    expect(await screen.findByText(/cycle 1 roles are fixed/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/invite email/i), "cashier@kwame.gh");
    await user.selectOptions(screen.getByLabelText(/^role$/i), ROLE_ID);
    await user.click(screen.getByRole("button", { name: /send invitation/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      /invitation token issued/i,
    );
    expect(await screen.findByText(/cashier@kwame.gh/i)).toBeInTheDocument();
  });

  it("blocks sole-owner deactivation with 409", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v1/users", () =>
        HttpResponse.json([
          {
            id: ownerSessionRecord.userId,
            email: "owner@kwame.gh",
            roleId: ROLE_ID,
            status: "Active",
            isOwner: true,
          },
        ]),
      ),
      http.get("*/api/v1/roles", () =>
        HttpResponse.json([{ id: ROLE_ID, name: "Owner" }]),
      ),
      http.patch("*/api/v1/users/:id", () =>
        HttpResponse.json({ title: "Sole owner" }, { status: 409 }),
      ),
    );
    renderWithProviders(<StaffList />);
    pageConfirm(true);
    await user.click(await screen.findByRole("button", { name: /deactivate/i }));
    await waitFor(() => {
      expect(screen.getByText(/sole owner|open-shift/i)).toBeInTheDocument();
    });
  });

  it("sets write-only PIN with confirmation", async () => {
    const user = userEvent.setup();
    server.use(
      http.put("*/api/v1/users/:userId/pin", async ({ request }) => {
        const body = (await request.json()) as { pin: string };
        expect(body.pin).toBe("4321");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<RegisterPinForm userId={USER_ID} />);
    pageConfirm(true);
    await user.type(screen.getByLabelText(/new pin/i), "4321");
    await user.click(screen.getByRole("button", { name: /set pin/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/pin updated/i);
  });

  it("accepts an invitation", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(
        "*/api/v1/users/invitations/:id/accept",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    renderWithProviders(<AcceptInvitationForm userId={USER_ID} token="tok" />);
    await user.type(await screen.findByLabelText(/choose password/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /accept invitation/i }));
    expect(await screen.findByText(/invitation accepted/i)).toBeInTheDocument();
  });

  it("enrolls 2FA", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/auth/2fa/enroll", () =>
        HttpResponse.json({
          sharedKey: "KEY",
          authenticatorUri: "otpauth://totp/x",
        }),
      ),
    );
    renderWithProviders(<TwoFactorSettings />);
    await user.click(screen.getByRole("button", { name: /enroll 2fa/i }));
    expect(await screen.findByText(/shared key: key/i)).toBeInTheDocument();
  });

  it("renders audit history rows", async () => {
    server.use(
      http.get("*/api/v1/audit-log", () =>
        HttpResponse.json({
          items: [
            {
              actor: "owner@kwame.gh",
              action: "UserInvited",
              target: "cashier@kwame.gh",
              reason: "Onboarding",
              occurredAt: "2026-08-13T12:00:00.000Z",
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );
    renderWithProviders(<AuditLogPanel />);
    expect(await screen.findByText(/userinvited/i)).toBeInTheDocument();
    expect(screen.getByText(/onboarding/i)).toBeInTheDocument();
  });
});
