import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../shared/test/msw/server";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import { REGISTER_ID } from "../../../../tests/fixtures/provider/us1";
import { exchangeRegisterPin } from "./auth-api";

function registerAccessToken(exp: number): string {
  const claims = { exp };
  return `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
}

describe("exchangeRegisterPin", () => {
  it("posts pin exchange payload and decodes token expiry", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    const exp = Math.floor(Date.UTC(2030, 0, 1) / 1000);
    let seenBody: unknown;
    server.use(
      http.post("*/api/v1/auth/pin/exchange", async ({ request }) => {
        seenBody = await request.json();
        return HttpResponse.json({
          accessToken: registerAccessToken(exp),
          tokenType: "Bearer",
        });
      }),
    );

    const result = await exchangeRegisterPin({
      userId: ownerSession.userId,
      pin: "1234",
      registerId: REGISTER_ID,
    });

    expect(seenBody).toEqual({
      userId: ownerSession.userId,
      pin: "1234",
      registerId: REGISTER_ID,
    });
    expect(result.accessToken).toContain("header.");
    expect(result.expiresAt).toBe(new Date(exp * 1000).toISOString());
  });
});
