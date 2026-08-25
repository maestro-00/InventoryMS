import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../shared/test/msw/server";
import { sessionManager } from "../../../../shared/auth/session-manager";
import { ownerSession } from "../../../../../tests/fixtures/provider/session";
import { registerRecord } from "../../../../../tests/fixtures/provider/us1";
import { updateRegister } from "./registers-api";

describe("updateRegister", () => {
  it("patches register name and active flag with If-Match", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    let seenBody: unknown;
    let seenIfMatch: string | null = null;
    server.use(
      http.patch(`*/api/v1/registers/${registerRecord.id}`, async ({ request }) => {
        seenBody = await request.json();
        seenIfMatch = request.headers.get("If-Match");
        return HttpResponse.json(
          {
            ...registerRecord,
            name: "Front counter",
            isActive: false,
          },
          { headers: { ETag: '"register-2"' } },
        );
      }),
    );

    const updated = await updateRegister(
      registerRecord.id,
      {
        name: "Front counter",
        isActive: false,
      },
      'W/"1"',
    );

    expect(seenBody).toEqual({ name: "Front counter", isActive: false });
    expect(seenIfMatch).toBe('W/"1"');
    expect(updated).toMatchObject({
      id: registerRecord.id,
      name: "Front counter",
      isActive: false,
      etag: '"register-2"',
    });
  });

  it("maps 409 conflicts to ProblemError", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.patch(`*/api/v1/registers/${registerRecord.id}`, () =>
        HttpResponse.json(
          {
            title: "Conflict",
            status: 409,
            detail: "Register was updated elsewhere.",
          },
          { status: 409 },
        ),
      ),
    );

    await expect(updateRegister(registerRecord.id, { name: "Stale" })).rejects.toMatchObject({
      problem: { status: 409 },
    });
  });
});
