import { describe, expect, it } from "vitest";
import { sessionFromTokens } from "./session-bootstrap";

function token(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/=+$/, "");
  return `header.${payload}.signature`;
}

const CLAIMS = {
  sub: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  role: "Owner",
  permissions: ["Sell", "ManageStock"],
  locationScope: ["33333333-3333-4333-8333-333333333333"],
  exp: 1786000000,
};

describe("sessionFromTokens", () => {
  it("builds the session from the provider claims", () => {
    const session = sessionFromTokens({
      requiresTwoFactor: false,
      accessToken: token(CLAIMS),
      refreshToken: "refresh",
      accessTokenExpiresAt: "2026-08-13T12:00:00.000Z",
    });

    expect(session).toMatchObject({
      userId: CLAIMS.sub,
      tenantId: CLAIMS.tenantId,
      role: "Owner",
      permissions: ["Sell", "ManageStock"],
      expiresAt: "2026-08-13T12:00:00.000Z",
    });
  });

  it("accepts space separated claim lists and derives the expiry", () => {
    const session = sessionFromTokens({
      requiresTwoFactor: false,
      accessToken: token({ ...CLAIMS, permissions: "Sell ViewReports" }),
      refreshToken: "refresh",
    });

    expect(session?.permissions).toEqual(["Sell", "ViewReports"]);
    expect(session?.expiresAt).toBe(new Date(CLAIMS.exp * 1000).toISOString());
  });

  it("accepts an access token alone when the refresh token lives in the cookie", () => {
    const session = sessionFromTokens({
      requiresTwoFactor: false,
      accessToken: token(CLAIMS),
    });

    expect(session?.accessToken).toBe(token(CLAIMS));
    expect(session?.refreshToken).toBe("");
  });

  it("maps InventoryX snake_case / Microsoft claim URIs", () => {
    const session = sessionFromTokens({
      requiresTwoFactor: false,
      accessToken: token({
        sub: CLAIMS.sub,
        tenant_id: CLAIMS.tenantId,
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Owner",
        location_scope: "*",
        is_owner: "true",
        exp: CLAIMS.exp,
      }),
      refreshToken: "refresh",
      accessTokenExpiresAt: "2026-08-13T12:00:00.000Z",
    });

    expect(session).toMatchObject({
      userId: CLAIMS.sub,
      tenantId: CLAIMS.tenantId,
      role: "Owner",
      locationScope: ["*"],
      expiresAt: "2026-08-13T12:00:00.000Z",
    });
    expect(session?.permissions).toEqual(
      expect.arrayContaining(["Sell", "ManageUsers", "ViewReports"]),
    );
  });

  it("derives Owner from is_owner when role claim is absent", () => {
    const session = sessionFromTokens({
      requiresTwoFactor: false,
      accessToken: token({
        sub: CLAIMS.sub,
        tenant_id: CLAIMS.tenantId,
        location_scope: CLAIMS.locationScope[0],
        is_owner: "true",
        exp: CLAIMS.exp,
      }),
      refreshToken: "refresh",
    });

    expect(session?.role).toBe("Owner");
    expect(session?.locationScope).toEqual([CLAIMS.locationScope[0]]);
  });

  it("returns null for a challenge, a malformed token, or missing claims", () => {
    expect(sessionFromTokens({ requiresTwoFactor: true })).toBeNull();
    expect(
      sessionFromTokens({
        requiresTwoFactor: false,
        accessToken: "not-a-jwt",
        refreshToken: "refresh",
      }),
    ).toBeNull();
    expect(
      sessionFromTokens({
        requiresTwoFactor: false,
        accessToken: token({ sub: "only-sub" }),
        refreshToken: "refresh",
      }),
    ).toBeNull();
  });
});
