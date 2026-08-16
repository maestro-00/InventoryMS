import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import {
  acceptInvitation,
  enrollTwoFactor,
  fetchAuditLog,
  fetchRoles,
  fetchStaffUsers,
  inviteStaff,
  setRegisterPin,
  updateStaffUser,
} from "../../src/features/staff/api/staff-api";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US9_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/users"],
  ["post", "/api/v1/users/invitations"],
  ["post", "/api/v1/users/invitations/{id}/accept"],
  ["patch", "/api/v1/users/{id}"],
  ["put", "/api/v1/users/{userId}/pin"],
  ["get", "/api/v1/roles"],
  ["get", "/api/v1/audit-log"],
  ["post", "/api/v1/auth/2fa/enroll"],
  ["post", "/api/v1/auth/2fa/verify"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

describe("US9 provider contract surface", () => {
  it("captures users/invite/roles/PIN/2FA/audit operations", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US9_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });
});

describe("staff API contracts", () => {
  it("invites, accepts, updates, sets PIN, enrolls 2FA, and reads audit", async () => {
    const userId = "c1111111-1111-4111-8111-111111111111";
    const roleId = "22222222-aaaa-4222-8222-222222222222";
    server.use(
      http.get("*/api/v1/users", () =>
        HttpResponse.json([
          {
            id: userId,
            email: "cashier@kwame.gh",
            roleId,
            locationScope: null,
            status: "Invited",
            isOwner: false,
          },
        ]),
      ),
      http.get("*/api/v1/roles", () =>
        HttpResponse.json([{ id: roleId, name: "Cashier", permissions: "Sell" }]),
      ),
      http.post("*/api/v1/users/invitations", () =>
        HttpResponse.json({ id: userId, token: "invite-token" }, { status: 201 }),
      ),
      http.post(
        "*/api/v1/users/invitations/:id/accept",
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.patch("*/api/v1/users/:id", () => new HttpResponse(null, { status: 204 })),
      http.put(
        "*/api/v1/users/:userId/pin",
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.post("*/api/v1/auth/2fa/enroll", () =>
        HttpResponse.json({
          sharedKey: "ABC",
          authenticatorUri: "otpauth://totp/test",
        }),
      ),
      http.get("*/api/v1/audit-log", () =>
        HttpResponse.json({
          items: [
            {
              action: "UserInvited",
              actor: "owner@kwame.gh",
              target: "cashier@kwame.gh",
              reason: null,
              occurredAt: new Date().toISOString(),
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    expect((await fetchStaffUsers())[0]?.email).toBe("cashier@kwame.gh");
    expect((await fetchRoles())[0]?.name).toBe("Cashier");
    expect((await inviteStaff({ email: "cashier@kwame.gh", roleId })).token).toBe(
      "invite-token",
    );
    await acceptInvitation({
      userId,
      token: "invite-token",
      password: "correct-horse",
    });
    await updateStaffUser(userId, { status: "Active", locationScope: "loc" });
    await setRegisterPin(userId, "1234");
    expect((await enrollTwoFactor()).sharedKey).toBe("ABC");
    expect((await fetchAuditLog()).totalCount).toBe(1);
  });
});
