import { afterEach, describe, expect, it, vi } from "vitest";
import { authSessionFixture } from "../../../../tests/fixtures/domain";
import { sessionManager } from "../../auth/session-manager";
import {
  getRegisterAccessToken,
  lockRegisterAuth,
  unlockRegister,
} from "../../auth/register-auth-store";
import { ifMatchHeaders, inventoryxClient, readProblem } from "./inventoryx-client";

const originalFetch = globalThis.fetch;

afterEach(async () => {
  sessionManager.signOut();
  await lockRegisterAuth({ persistPartition: false });
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("inventoryx client", () => {
  it("exposes a single generated transport and If-Match helper", () => {
    expect(inventoryxClient).toBeDefined();
    expect(ifMatchHeaders('W/"1"')).toEqual({ "If-Match": 'W/"1"' });
    expect(ifMatchHeaders(undefined)).toEqual({});
  });

  it("attaches the memory access token and retries once after refresh", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    let productCalls = 0;
    const seenCredentials: Array<RequestCredentials | null> = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      seenCredentials.push(request.credentials);
      const url = request.url;
      if (url.includes("/auth/refresh")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: "test-access-next",
              refreshToken: "test-refresh-next",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.includes("/api/v1/products")) {
        productCalls += 1;
        if (productCalls === 1) {
          expect(request.headers.get("Authorization")).toBe("Bearer access-token");
          return Promise.resolve(new Response(null, { status: 401 }));
        }
        expect(request.headers.get("Authorization")).toBe("Bearer test-access-next");
        expect(request.headers.get("X-Retry-After-Refresh")).toBe("1");
        return Promise.resolve(
          new Response(
            JSON.stringify({ items: [], page: 1, pageSize: 50, totalCount: 0 }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });

    const result = await inventoryxClient.GET("/api/v1/products");
    expect(result.response.ok).toBe(true);
    expect(productCalls).toBe(2);
    expect(seenCredentials.every((value) => value === "include")).toBe(true);
  });

  it("returns the original 401 when refresh is unavailable", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 401 })),
    );
    const unauthorized = await inventoryxClient.GET("/api/v1/products");
    expect(unauthorized.response.status).toBe(401);
  });

  it("maps JSON and non-JSON failures into AppProblem", async () => {
    const jsonProblem = await readProblem(
      new Response(JSON.stringify({ title: "Nope", status: 403 }), {
        status: 403,
        headers: { "Content-Type": "application/problem+json" },
      }),
    );
    expect(jsonProblem.kind).toBe("forbidden");

    const empty = await readProblem(new Response("not-json", { status: 500 }));
    expect(empty.kind).toBe("transient");
  });

  it("sends the register token on sync routes when the till is unlocked", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "user-access",
      refreshToken: "user-refresh",
    });
    await unlockRegister({
      tenantId: authSessionFixture.tenantId,
      registerId: "88888888-8888-4888-8888-888888888888",
      shiftId: "99999999-9999-4999-8999-999999999999",
      accessToken: "register-access-token",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });

    const authHeaders: string[] = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      authHeaders.push(request.headers.get("Authorization") ?? "");
      return Promise.resolve(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await inventoryxClient.POST("/api/v1/sync/sales", {
      body: { sales: [] } as never,
    });
    expect(authHeaders[0]).toBe("Bearer register-access-token");
  });

  it("does not fall back to the user JWT on sync routes after register lock", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "user-a-access",
      refreshToken: "user-a-refresh",
    });
    await unlockRegister({
      tenantId: authSessionFixture.tenantId,
      registerId: "88888888-8888-4888-8888-888888888888",
      shiftId: "99999999-9999-4999-8999-999999999999",
      accessToken: "user-a-register-token",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    await expect(getRegisterAccessToken()).resolves.toBe("user-a-register-token");

    sessionManager.setSession({
      ...authSessionFixture,
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "user-b-access",
      refreshToken: "user-b-refresh",
    });
    await lockRegisterAuth({ persistPartition: false });
    await expect(getRegisterAccessToken()).resolves.toBeNull();

    const authHeaders: Array<string | null> = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      authHeaders.push(request.headers.get("Authorization"));
      return Promise.resolve(
        new Response(JSON.stringify({ results: [] }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    await inventoryxClient.POST("/api/v1/sync/sales", {
      body: { sales: [] } as never,
    });
    expect(authHeaders[0]).toBeNull();
  });
});
