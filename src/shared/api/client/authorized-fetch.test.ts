import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionManager } from "../../auth/session-manager";
import { authorizedFetch } from "./authorized-fetch";

const originalFetch = globalThis.fetch;

const sessionRecord = {
  userId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  role: "Owner",
  permissions: ["ViewReports"],
  locationScope: ["33333333-3333-4333-8333-333333333333"],
  expiresAt: "2026-08-13T12:00:00.000Z",
  accessToken: "first-access",
  refreshToken: "first-refresh",
};

beforeEach(() => {
  sessionManager.setSession({ ...sessionRecord });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  sessionManager.signOut();
  vi.restoreAllMocks();
});

describe("authorizedFetch", () => {
  it("attaches the bearer token and JSON defaults", async () => {
    const calls: Request[] = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(new Request(input, init));
      return Promise.resolve(new Response("{}", { status: 200 }));
    });

    await authorizedFetch("http://localhost:5088/api/v1/dashboard");

    expect(calls[0]?.headers.get("Authorization")).toBe("Bearer first-access");
    expect(calls[0]?.headers.get("Accept")).toBe("application/json");
    expect(calls[0]?.credentials).toBe("include");
  });

  it("refreshes once on 401 and retries the original request", async () => {
    const seen: string[] = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/auth/refresh")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: "second-access",
              refreshToken: "second-refresh",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      const headers = new Headers(init?.headers);
      seen.push(headers.get("Authorization") ?? "none");
      return Promise.resolve(
        new Response(null, { status: seen.length === 1 ? 401 : 200 }),
      );
    });

    const response = await authorizedFetch("http://localhost:5088/api/v1/dashboard");

    expect(response.status).toBe(200);
    expect(seen).toEqual(["Bearer first-access", "Bearer second-access"]);
  });

  it("returns the 401 without retrying again when the refreshed token is also rejected", async () => {
    let dataCalls = 0;
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/auth/refresh")) {
        return Promise.resolve(
          new Response(JSON.stringify({ accessToken: "second-access" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      dataCalls += 1;
      return Promise.resolve(new Response(null, { status: 401 }));
    });

    const response = await authorizedFetch("http://localhost:5088/api/v1/dashboard");

    expect(response.status).toBe(401);
    expect(dataCalls).toBe(2);
  });

  it("does not attempt a refresh when there is no session", async () => {
    sessionManager.signOut();
    let refreshCalls = 0;
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/auth/refresh")) refreshCalls += 1;
      return Promise.resolve(new Response(null, { status: 401 }));
    });

    const response = await authorizedFetch("http://localhost:5088/api/v1/dashboard");

    expect(response.status).toBe(401);
    expect(refreshCalls).toBe(0);
  });
});
