import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "../generated/inventoryx";
import { parseAppProblem } from "../errors/app-problem";
import { sessionManager } from "../../auth/session-manager";
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

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const headers = new Headers(request.headers);
    const token = sessionManager.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Accept", headers.get("Accept") || "application/json");
    return new Request(request, { headers });
  },
  async onResponse({ response, request }) {
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
