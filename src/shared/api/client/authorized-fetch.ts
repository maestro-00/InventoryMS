import { sessionManager } from "../../auth/session-manager";

/** Marks the single retry a request is allowed after a refresh, so a 401 cannot loop. */
export const RETRY_AFTER_REFRESH_HEADER = "X-Retry-After-Refresh";

/** Adds the bearer token and the JSON defaults every InventoryX endpoint expects. */
export function withAuthHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const token = sessionManager.getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", headers.get("Accept") || "application/json");
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

/**
 * True when a response is worth refreshing for: an unauthenticated answer to a request
 * that carried a token and has not already been retried.
 */
export function shouldRefreshAndRetry(status: number, headers: Headers): boolean {
  if (status !== 401) return false;
  if (headers.get(RETRY_AFTER_REFRESH_HEADER) === "1") return false;
  return sessionManager.getAccessToken() !== null;
}

/**
 * `fetch` for endpoints the typed client does not cover. Shares the bearer and
 * refresh-then-retry behaviour of `inventoryxClient` so an expired access token is
 * renewed here too instead of surfacing as a bare failure.
 */
export async function authorizedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = withAuthHeaders(init);
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  if (!shouldRefreshAndRetry(response.status, headers)) return response;

  try {
    await sessionManager.refresh();
  } catch {
    return response;
  }

  const retryHeaders = withAuthHeaders(init);
  retryHeaders.set(RETRY_AFTER_REFRESH_HEADER, "1");
  return fetch(url, { ...init, headers: retryHeaders, credentials: "include" });
}
