import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../../shared/test/msw/server";
import { sessionManager } from "../../../../shared/auth/session-manager";
import { ownerSession } from "../../../../../tests/fixtures/provider/session";
import { registerRecord } from "../../../../../tests/fixtures/provider/us1";
import { fetchRegisters } from "./registers-api";

describe("fetchRegisters", () => {
  it("does not stamp the collection ETag onto register rows", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/registers", () =>
        HttpResponse.json([registerRecord], {
          headers: { ETag: '"registers-list"' },
        }),
      ),
    );

    const registers = await fetchRegisters();
    expect(registers).toHaveLength(1);
    expect(registers[0]).toMatchObject({
      id: registerRecord.id,
      name: registerRecord.name,
    });
    expect(registers[0]?.etag).toBeUndefined();
  });
});
