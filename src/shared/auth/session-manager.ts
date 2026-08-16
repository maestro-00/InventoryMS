import type { SessionSnapshot } from "./access-policy";
import { sessionSnapshotSchema } from "./access-policy";
import { sessionFromTokens } from "./session-claims";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
}

export type SessionRecord = SessionSnapshot & SessionTokens;

export type SessionEvent =
  | { type: "set"; clearCache: boolean; lockRegister: boolean }
  | { type: "scope"; clearCache: boolean; lockRegister: boolean }
  | { type: "sign-out"; clearCache: boolean; lockRegister: boolean }
  | { type: "refresh"; clearCache: boolean; lockRegister: boolean }
  | { type: "restore"; clearCache: boolean; lockRegister: boolean };

export type SessionListener = (event: SessionEvent) => void;

/**
 * "restoring" means the app has not yet decided who is signed in, so guards must wait
 * instead of treating the empty session as a rejection.
 */
export type SessionStatus = "restoring" | "authenticated" | "anonymous";

/**
 * Readable companion to the httpOnly refresh cookie. InventoryX sets both on sign-in and
 * clears both on sign-out; the readable one tells the SPA a silent restore is worth an
 * request, so anonymous visitors never pay for a doomed refresh round trip.
 */
export const SESSION_MARKER_COOKIE = "inventoryx_session";

/** Statuses that mean the refresh token itself is finished, not that the call failed. */
const REJECTED_REFRESH_STATUSES = new Set([400, 401, 403]);

function hasSessionMarker(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((entry) => entry.trim().startsWith(`${SESSION_MARKER_COOKIE}=`));
}

function clearSessionMarker(): void {
  if (typeof document === "undefined") return;
  // Match the provider's Path=/ marker. Secure is required when the page is HTTPS so the
  // browser actually drops the Secure cookie InventoryX set.
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_MARKER_COOKIE}=; Max-Age=0; path=/${secure}`;
}

export interface SessionManagerOptions {
  origin: string;
  fetchImpl?: typeof fetch;
}

export class SessionManager {
  private readonly origin: string;
  private readonly fetchImpl: typeof fetch;
  private session: SessionRecord | null = null;
  private snapshotCache: SessionSnapshot | null = null;
  private refreshInFlight: Promise<SessionTokens> | null = null;
  private restoreInFlight: Promise<void> | null = null;
  private restored = false;
  private readonly listeners = new Set<SessionListener>();

  constructor(options: SessionManagerOptions) {
    this.origin = options.origin.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? ((...args) => globalThis.fetch(...args));
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getAccessToken(): string | null {
    return this.session?.accessToken ?? null;
  }

  getSnapshot(): SessionSnapshot | null {
    return this.snapshotCache;
  }

  getStatus(): SessionStatus {
    if (!this.restored) return "restoring";
    return this.session ? "authenticated" : "anonymous";
  }

  /**
   * Resolves once the app knows whether anyone is signed in. Starts the restore itself so
   * a route guard can await it without depending on a provider effect having run first.
   */
  async whenRestored(): Promise<void> {
    if (this.restored) return;
    await this.restore();
  }

  /**
   * Trades the httpOnly refresh cookie for a session so a reload, restored tab, or deep
   * link does not force a new sign-in while the tokens are still valid.
   */
  async restore(): Promise<SessionStatus> {
    if (this.restored) return this.getStatus();
    this.restoreInFlight ??= this.restoreOnce();
    await this.restoreInFlight;
    return this.getStatus();
  }

  /** Settles the restore for sessions established by other means, such as registration. */
  markRestored(): void {
    if (!this.settleRestore()) return;
    this.emit({ type: "restore", clearCache: false, lockRegister: false });
  }

  setSession(record: SessionRecord): void {
    this.session = sessionSnapshotSchema.parse({
      ...record,
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
    }) as SessionRecord;
    this.session.accessToken = record.accessToken;
    this.session.refreshToken = record.refreshToken;
    this.syncSnapshot();
    this.settleRestore();
    this.emit({ type: "set", clearCache: false, lockRegister: false });
  }

  transitionScope(
    next: Partial<Pick<SessionSnapshot, "tenantId" | "locationScope" | "registerId">>,
  ): void {
    if (!this.session) return;
    this.session = {
      ...this.session,
      ...next,
    };
    this.syncSnapshot();
    this.emit({
      type: "scope",
      clearCache: true,
      lockRegister: Boolean(next.registerId),
    });
  }

  async refresh(): Promise<SessionTokens> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.refreshOnce();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  signOut(): void {
    this.session = null;
    this.snapshotCache = null;
    this.refreshInFlight = null;
    this.settleRestore();
    clearSessionMarker();
    this.emit({ type: "sign-out", clearCache: true, lockRegister: true });
    // The httpOnly refresh cookie can only be cleared by the provider.
    void this.clearProviderCookies();
  }

  private async clearProviderCookies(): Promise<void> {
    try {
      await this.fetchImpl(`${this.origin}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
    } catch {
      // Local session is already gone; a failed cookie clear leaves the next restore
      // attempt to discover a rejected refresh and clear itself.
    }
  }

  private async restoreOnce(): Promise<void> {
    try {
      if (!hasSessionMarker()) return;
      const response = await this.fetchImpl(`${this.origin}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        if (REJECTED_REFRESH_STATUSES.has(response.status)) clearSessionMarker();
        return;
      }
      const body = (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpiresAt?: string;
      };
      const record = sessionFromTokens(body);
      if (record) this.setSession(record);
    } catch {
      // Offline or unreachable provider: stay anonymous and let the user sign in.
    } finally {
      this.restoreInFlight = null;
      this.markRestored();
    }
  }

  private settleRestore(): boolean {
    if (this.restored) return false;
    this.restored = true;
    return true;
  }

  private async refreshOnce(): Promise<SessionTokens> {
    const refreshToken = this.session?.refreshToken;
    const canUseCookie = hasSessionMarker();
    if (!refreshToken && !canUseCookie) {
      this.signOut();
      throw new Error("No refresh token");
    }
    const headers = new Headers({ Accept: "application/json" });
    const init: RequestInit = {
      method: "POST",
      headers,
      credentials: "include",
    };
    // Prefer the in-memory token when present; otherwise the httpOnly cookie alone is
    // enough for InventoryX's empty-body refresh.
    if (refreshToken) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify({ refreshToken });
    }
    const response = await this.fetchImpl(`${this.origin}/api/v1/auth/refresh`, init);
    if (!response.ok) {
      // Only the provider disowning the refresh token ends the session. A 500, 429, or
      // network failure is the refresh endpoint being unavailable, and signing out there
      // would evict a user whose tokens are still valid.
      if (!REJECTED_REFRESH_STATUSES.has(response.status)) {
        throw new Error(`Refresh unavailable (${String(response.status)})`);
      }
      this.signOut();
      throw new Error("Refresh failed");
    }
    const body = (await response.json()) as {
      accessToken: string;
      refreshToken?: string;
      accessTokenExpiresAt?: string;
    };
    const tokens: SessionTokens = {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken ?? refreshToken ?? "",
    };
    if (body.accessTokenExpiresAt) {
      tokens.accessTokenExpiresAt = body.accessTokenExpiresAt;
    }
    if (this.session) {
      this.session = {
        ...this.session,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: body.accessTokenExpiresAt ?? this.session.expiresAt,
      };
      this.syncSnapshot();
    }
    this.emit({ type: "refresh", clearCache: false, lockRegister: false });
    return tokens;
  }

  private syncSnapshot(): void {
    if (!this.session) {
      this.snapshotCache = null;
      return;
    }
    const {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
      ...snapshot
    } = this.session;
    this.snapshotCache = snapshot;
  }

  private emit(event: SessionEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

export const sessionManager = new SessionManager({
  origin: import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088",
});
