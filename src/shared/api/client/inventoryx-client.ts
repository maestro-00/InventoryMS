import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "../generated/inventoryx";
import { parseAppProblem } from "../errors/app-problem";
import { sessionManager } from "../../auth/session-manager";
import {
  getRegisterAccessToken,
  lockRegisterAuth,
} from "../../auth/register-auth-store";
import { RETRY_AFTER_REFRESH_HEADER, shouldRefreshAndRetry } from "./authorized-fetch";

const origin = import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088";

function runtimeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // InventoryX sets session cookies on login/register/refresh; credentials must travel
  // with every call so the browser stores and returns them across the SPA origin.
  if (input instanceof Request) {
    return globalThis.fetch(new Request(input, { credentials: "include" }));
  }
  return globalThis.fetch(input, { ...init, credentials: "include" });
}

/**
 * Sync ingest + snapshot require the register-scoped token (api-integration.md).
 * Never fall back to the user JWT on these paths.
 */
function prefersRegisterToken(url: string): boolean {
  try {
    const path = new URL(url, origin).pathname;
    return (
      path === "/api/v1/sync/sales" ||
      path.startsWith("/api/v1/sync/sales/") ||
      path === "/api/v1/sync/snapshot"
    );
  } catch {
    return /\/api\/v1\/sync\/(sales|snapshot)/.test(url);
  }
}

async function resolveAccessToken(url: string): Promise<string | null> {
  if (prefersRegisterToken(url)) {
    // Fail closed: missing register unlock must not escalate to user JWT.
    // When the URL names a till (snapshot), refuse a token unlocked for another register.
    let registerId: string | undefined;
    try {
      registerId = new URL(url, origin).searchParams.get("registerId") ?? undefined;
    } catch {
      registerId = undefined;
    }
    return getRegisterAccessToken(registerId ? { registerId } : undefined);
  }
  return sessionManager.getAccessToken();
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const headers = new Headers(request.headers);
    const token = await resolveAccessToken(request.url);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Accept", headers.get("Accept") || "application/json");
    return new Request(request, { headers });
  },
  async onResponse({ response, request }) {
    if (
      prefersRegisterToken(request.url) &&
      (response.status === 401 || response.status === 403)
    ) {
      // Any auth failure on sync routes locks the till for upload until PIN re-entry,
      // regardless of whether a register token or (legacy) other credential was sent.
      void lockRegisterAuth({ persistPartition: true });
      return response;
    }
    if (!shouldRefreshAndRetry(response.status, request.headers)) return response;
    try {
      await sessionManager.refresh();
    } catch {
      return response;
    }
    const retryHeaders = new Headers(request.headers);
    const token = sessionManager.getAccessToken();
    if (token) retryHeaders.set("Authorization", `Bearer ${token}`);
    retryHeaders.set(RETRY_AFTER_REFRESH_HEADER, "1");
    return runtimeFetch(new Request(request, { headers: retryHeaders }));
  },
};

export const inventoryxClient = createClient<paths>({
  baseUrl: origin,
  fetch: runtimeFetch,
});

inventoryxClient.use(authMiddleware);

export async function readProblem(response: Response) {
  let body: unknown = undefined;
  try {
    body = await response.clone().json();
  } catch {
    body = undefined;
  }
  return parseAppProblem({
    status: response.status,
    body,
    headers: response.headers,
  });
}

export function ifMatchHeaders(etag: string | undefined): HeadersInit {
  return etag ? { "If-Match": etag } : {};
}
