import { afterEach, describe, expect, it, vi } from "vitest";
import { authSessionFixture } from "../../../../tests/fixtures/domain";
import { sessionManager } from "../../auth/session-manager";
import { ifMatchHeaders, inventoryxClient, readProblem } from "./inventoryx-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  sessionManager.signOut();
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
});
