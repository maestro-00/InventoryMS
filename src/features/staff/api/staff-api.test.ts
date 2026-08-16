import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import {
  acceptInvitation,
  enrollTwoFactor,
  fetchAuditLog,
  fetchStaffUsers,
  setRegisterPin,
  staffScopeQueryPrefixes,
  updateStaffUser,
} from "./staff-api";

describe("staff api", () => {
  it("loads users from array and paged envelopes", async () => {
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
            id: "u1",
            email: "a@b.com",
            name: "A",
            status: "Active",
          },
        ]),
      ),
    );
    await expect(fetchStaffUsers()).resolves.toHaveLength(1);

    server.use(
      http.get("*/api/v1/users", () =>
        HttpResponse.json({
          items: [{ id: "u2", status: "Invited" }],
        }),
      ),
    );
    await expect(fetchStaffUsers()).resolves.toMatchObject([
      { id: "u2", status: "Invited" },
    ]);
  });

  it("covers pin, 2fa, audit, update, and invitation paths", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.put("*/api/v1/users/:id/pin", () => HttpResponse.json(true)),
      http.post("*/api/v1/auth/2fa/enroll", () =>
        HttpResponse.json({
          sharedKey: "ABC",
          authenticatorUri: "otpauth://totp/InventoryMS",
        }),
      ),
      http.get("*/api/v1/audit-log", () =>
        HttpResponse.json({
          items: [
            {
              action: "UserInvited",
              occurredAt: "2026-08-13T00:00:00Z",
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.patch("*/api/v1/users/:id", () => HttpResponse.json(true)),
      http.post("*/api/v1/users/invitations/:userId/accept", () =>
        HttpResponse.json(true),
      ),
    );
    await expect(setRegisterPin("u1", "1234")).resolves.toBeUndefined();
    await expect(enrollTwoFactor()).resolves.toMatchObject({ sharedKey: "ABC" });
    await expect(fetchAuditLog()).resolves.toMatchObject({ totalCount: 1 });
    await expect(updateStaffUser("u1", { status: "Active" })).resolves.toBeUndefined();
    await expect(
      acceptInvitation({ userId: "u1", token: "tok", password: "Secret123!" }),
    ).resolves.toBeUndefined();
    expect(staffScopeQueryPrefixes()).toContain("staff");
  });

  it("surfaces staff mutation failures", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/users", () => new HttpResponse(null, { status: 500 })),
      http.patch("*/api/v1/users/:id", () => new HttpResponse(null, { status: 409 })),
      http.put("*/api/v1/users/:id/pin", () => new HttpResponse(null, { status: 500 })),
      http.post(
        "*/api/v1/auth/2fa/enroll",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get("*/api/v1/audit-log", () => new HttpResponse(null, { status: 500 })),
      http.post(
        "*/api/v1/users/invitations/:userId/accept",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await expect(fetchStaffUsers()).rejects.toThrow(/Failed/);
    await expect(updateStaffUser("u1", { status: "Disabled" })).rejects.toThrow(
      /sole owner/i,
    );
    await expect(setRegisterPin("u1", "9999")).rejects.toThrow(/Failed/);
    await expect(enrollTwoFactor()).rejects.toThrow(/Failed/);
    await expect(fetchAuditLog()).rejects.toThrow(/Failed/);
    await expect(
      acceptInvitation({ userId: "u1", token: "tok", password: "Secret123!" }),
    ).rejects.toThrow(/Failed/);
  });
});
