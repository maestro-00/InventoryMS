import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../shared/test/msw/server";
import { sessionManager } from "../../../../shared/auth/session-manager";
import { ownerSession } from "../../../../../tests/fixtures/provider/session";
import {
  registerRecord,
  shiftRecord,
} from "../../../../../tests/fixtures/provider/us1";
import { fetchOpenShifts, fetchRegisterShifts } from "./registers-api";

describe("shift list API", () => {
  it("requests open shifts with status=Open and parses decimal floats", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    let seenStatus: string | null = null;
    server.use(
      http.get("*/api/v1/shifts", ({ request }) => {
        seenStatus = new URL(request.url).searchParams.get("status");
        return HttpResponse.json([shiftRecord]);
      }),
    );

    const shifts = await fetchOpenShifts();

    expect(seenStatus).toBe("Open");
    expect(shifts).toEqual([
      {
        ...shiftRecord,
        openingFloat: "100",
      },
    ]);
  });

  it("returns an empty list when no open shifts exist", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(http.get("*/api/v1/shifts", () => HttpResponse.json([])));

    await expect(fetchOpenShifts()).resolves.toEqual([]);
  });

  it("lists register-scoped open shifts", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    let seenStatus: string | null = null;
    server.use(
      http.get(`*/api/v1/registers/${registerRecord.id}/shifts`, ({ request }) => {
        seenStatus = new URL(request.url).searchParams.get("status");
        return HttpResponse.json([shiftRecord]);
      }),
    );

    const shifts = await fetchRegisterShifts(registerRecord.id, "Open");

    expect(seenStatus).toBe("Open");
    expect(shifts[0]?.id).toBe(shiftRecord.id);
  });
});
