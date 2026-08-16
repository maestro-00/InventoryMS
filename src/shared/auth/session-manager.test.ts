import { afterEach, describe, expect, it, vi } from "vitest";
import { authSessionFixture } from "../../../tests/fixtures/domain";
import { SESSION_MARKER_COOKIE, SessionManager } from "./session-manager";

const originalFetch = globalThis.fetch;

const memoryStore = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
  };
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: memoryStore(),
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: memoryStore(),
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  vi.restoreAllMocks();
});

function createManager(fetchImpl?: typeof fetch | ReturnType<typeof vi.fn>) {
  return new SessionManager({
    origin: "http://localhost:5088",
    ...(fetchImpl ? { fetchImpl: fetchImpl as typeof fetch } : {}),
  });
}

function sessionRecord(
  overrides: Partial<{
    accessToken: string;
    refreshToken: string;
    registerId: string;
  }> = {},
) {
  return {
    userId: authSessionFixture.userId,
    tenantId: authSessionFixture.tenantId,
    role: authSessionFixture.role,
    permissions: [...authSessionFixture.permissions],
    locationScope: [...authSessionFixture.locationScope],
    expiresAt: authSessionFixture.expiresAt,
    accessToken: "access-token",
    refreshToken: "refresh-token",
    ...overrides,
  };
}

describe("SessionManager", () => {
  it("keeps access and refresh tokens in memory only", () => {
    const manager = createManager();
    manager.setSession(sessionRecord());

    expect(manager.getAccessToken()).toBe("access-token");
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(globalThis.localStorage.getItem("refreshToken")).toBeNull();
  });

  it("single-flights concurrent refresh and retries at most once", async () => {
    let refreshCalls = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes("/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return new Response(
          JSON.stringify({
            accessToken: "next-access",
            refreshToken: "next-refresh",
            accessTokenExpiresAt: "2026-08-13T13:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      throw new Error(`unexpected fetch ${url}`);
    }) as typeof fetch;
    const manager = createManager(fetchImpl);
    manager.setSession(sessionRecord({ accessToken: "expired" }));

    const [first, second] = await Promise.all([manager.refresh(), manager.refresh()]);

    expect(refreshCalls).toBe(1);
    expect(first.accessToken).toBe("next-access");
    expect(second.accessToken).toBe("next-access");
    expect(manager.getAccessToken()).toBe("next-access");
  });

  it("tears down scoped state when tenant, location, or register changes", () => {
    const manager = createManager();
    const onScopeChange = vi.fn();
    manager.subscribe(onScopeChange);
    manager.setSession(sessionRecord({ registerId: "reg-1" }));

    manager.transitionScope({
      tenantId: "99999999-9999-4999-8999-999999999999",
      locationScope: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
      registerId: "reg-2",
    });

    expect(onScopeChange).toHaveBeenCalled();
    const payload = onScopeChange.mock.calls.at(-1)?.[0] as {
      clearCache: boolean;
      lockRegister: boolean;
    };
    expect(payload.clearCache).toBe(true);
    expect(manager.getSnapshot()?.tenantId).toBe(
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("locks the register partition on sign-out without persisting the refresh token", () => {
    const manager = createManager();
    const onLock = vi.fn();
    manager.subscribe(onLock);
    manager.setSession(sessionRecord({ registerId: "reg-1" }));

    manager.signOut();

    expect(manager.getAccessToken()).toBeNull();
    expect(manager.getSnapshot()).toBeNull();
    expect(globalThis.localStorage.length).toBe(0);
    const lockEvent = onLock.mock.calls.find(
      (call) => (call[0] as { type?: string }).type === "sign-out",
    )?.[0] as { lockRegister: boolean };
    expect(lockEvent.lockRegister).toBe(true);
  });

  it("signs out when refresh has no token or the provider rejects it", async () => {
    const missing = createManager();
    await expect(missing.refresh()).rejects.toThrow("No refresh token");

    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response("nope", { status: 401 })),
    );
    const manager = createManager(fetchImpl);
    manager.setSession(sessionRecord());
    await expect(manager.refresh()).rejects.toThrow("Refresh failed");
    expect(manager.getAccessToken()).toBeNull();
  });

  it("ignores scope changes without a session and stops notifying after unsubscribe", () => {
    const manager = createManager();
    manager.transitionScope({ registerId: "reg-9" });
    expect(manager.getSnapshot()).toBeNull();

    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);
    manager.setSession(sessionRecord());
    unsubscribe();
    manager.signOut();
    expect(
      listener.mock.calls.some(
        (call) => (call[0] as { type: string }).type === "sign-out",
      ),
    ).toBe(false);
  });

  it("keeps the session when the refresh endpoint fails transiently", async () => {
    for (const status of [429, 500, 503]) {
      const fetchImpl = vi.fn(() => Promise.resolve(new Response("busy", { status })));
      const manager = createManager(fetchImpl);
      manager.setSession(sessionRecord());

      await expect(manager.refresh()).rejects.toThrow(/unavailable/i);

      expect(manager.getAccessToken()).toBe("access-token");
      expect(manager.getSnapshot()).not.toBeNull();
    }
  });

  it("keeps the session when the refresh request never reaches the provider", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError("network down")));
    const manager = createManager(fetchImpl);
    manager.setSession(sessionRecord());

    await expect(manager.refresh()).rejects.toThrow(/network down/i);

    expect(manager.getAccessToken()).toBe("access-token");
  });

  it("signs out when the provider rejects the refresh token itself", async () => {
    for (const status of [400, 401, 403]) {
      const fetchImpl = vi.fn(() => Promise.resolve(new Response("no", { status })));
      const manager = createManager(fetchImpl);
      manager.setSession(sessionRecord());

      await expect(manager.refresh()).rejects.toThrow("Refresh failed");

      expect(manager.getSnapshot()).toBeNull();
    }
  });

  it("reports restoring until the cookie session settles", async () => {
    const manager = createManager();
    expect(manager.getStatus()).toBe("restoring");

    manager.markRestored();

    expect(manager.getStatus()).toBe("anonymous");
    await expect(manager.whenRestored()).resolves.toBeUndefined();
  });

  it("adopts a cookie-backed session without a stored refresh token", async () => {
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;
    const claims = {
      sub: authSessionFixture.userId,
      tenantId: authSessionFixture.tenantId,
      role: "Owner",
      permissions: ["Sell"],
      locationScope: [...authSessionFixture.locationScope],
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const accessToken = `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
    let sentCredentials: RequestCredentials | undefined;
    let sentBody: string | null = null;
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      sentCredentials = init?.credentials;
      sentBody = typeof init?.body === "string" ? init.body : null;
      return Promise.resolve(
        new Response(JSON.stringify({ accessToken, refreshToken: "rotated" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as unknown as typeof fetch;
    const manager = createManager(fetchImpl);

    await manager.restore();

    expect(sentCredentials).toBe("include");
    expect(sentBody).toBeNull();
    expect(manager.getStatus()).toBe("authenticated");
    expect(manager.getSnapshot()?.role).toBe("Owner");
    document.cookie = `${SESSION_MARKER_COOKIE}=; Max-Age=0; path=/`;
  });

  it("restores when the provider returns only an access token (refresh stays in the cookie)", async () => {
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;
    const claims = {
      sub: authSessionFixture.userId,
      tenantId: authSessionFixture.tenantId,
      role: "Owner",
      permissions: ["Sell"],
      locationScope: [...authSessionFixture.locationScope],
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const accessToken = `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ accessToken }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const manager = createManager(fetchImpl);

    await manager.restore();

    expect(manager.getStatus()).toBe("authenticated");
    expect(manager.getAccessToken()).toBe(accessToken);
    document.cookie = `${SESSION_MARKER_COOKIE}=; Max-Age=0; path=/`;
  });

  it("refreshes from the httpOnly cookie when memory has no refresh token", async () => {
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;
    const manager = createManager(
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.credentials).toBe("include");
        expect(init?.body).toBeUndefined();
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: "cookie-access",
              refreshToken: "cookie-refresh",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }),
    );
    manager.setSession(sessionRecord({ refreshToken: "" }));

    const tokens = await manager.refresh();

    expect(tokens.accessToken).toBe("cookie-access");
    expect(manager.getAccessToken()).toBe("cookie-access");
    document.cookie = `${SESSION_MARKER_COOKIE}=; Max-Age=0; path=/`;
  });

  it("asks the provider to clear cookies on sign-out", async () => {
    const calls: Array<{ url: string; credentials?: RequestCredentials }> = [];
    const fetchImpl = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const entry: { url: string; credentials?: RequestCredentials } = {
        url: input instanceof Request ? input.url : String(input),
      };
      if (init?.credentials) entry.credentials = init.credentials;
      calls.push(entry);
      return Promise.resolve(new Response(null, { status: 200 }));
    });
    const manager = createManager(fetchImpl);
    manager.setSession(sessionRecord());
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;

    manager.signOut();
    await vi.waitFor(() => {
      expect(calls.some((call) => call.url.includes("/auth/logout"))).toBe(true);
    });

    const logout = calls.find((call) => call.url.includes("/auth/logout"));
    expect(logout?.credentials).toBe("include");
    expect(manager.getSnapshot()).toBeNull();
  });

  it("stays anonymous and silent when no session cookie is present", async () => {
    const fetchImpl = vi.fn();
    const manager = createManager(fetchImpl);

    await manager.restore();

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(manager.getStatus()).toBe("anonymous");
  });

  it("restores once for concurrent callers", async () => {
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;
    const fetchImpl = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(null, { status: 401 });
    }) as unknown as typeof fetch;
    const manager = createManager(fetchImpl);

    await Promise.all([manager.restore(), manager.restore(), manager.whenRestored()]);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(manager.getStatus()).toBe("anonymous");
    document.cookie = `${SESSION_MARKER_COOKIE}=; Max-Age=0; path=/`;
  });

  it("reuses the current refresh token when the provider omits a replacement", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ accessToken: "rotated-access" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const manager = createManager(fetchImpl);
    manager.setSession(sessionRecord());
    const tokens = await manager.refresh();
    expect(tokens.accessToken).toBe("rotated-access");
    expect(tokens.refreshToken).toBe("refresh-token");
  });
});
