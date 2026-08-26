import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authSessionFixture } from "../../../tests/fixtures/domain";
import {
  SESSION_MARKER_COOKIE,
  SessionManager,
  sessionManager,
} from "../../shared/auth/session-manager";
import {
  getRegisterAuthState,
  unlockRegister,
} from "../../shared/auth/register-auth-store";
import {
  isRegisterPartitionLocked,
  rememberRegisterPartition,
} from "../../shared/db/register-partition-lock";
import {
  openRegisterDatabase,
  partitionKey,
  replaceSnapshotAtomically,
} from "../../shared/db/register-database";
import { AppProviders } from "./app-providers";

const tenantId = authSessionFixture.tenantId;
const registerId = "88888888-8888-4888-8888-888888888888";

async function seedUnlockedPartition() {
  const db = openRegisterDatabase(tenantId, registerId);
  await replaceSnapshotAtomically(db, {
    meta: {
      id: partitionKey(tenantId, registerId),
      tenantId,
      registerId,
      shiftId: "99999999-9999-4999-8999-999999999999",
      locked: false,
      readinessDeadline: new Date(Date.now() + 3_600_000).toISOString(),
      watermark: "AAA=",
      bundleVersion: "1",
      preparedAt: new Date().toISOString(),
    },
    products: [],
    stock: [],
    taxes: [],
  });
  db.close();
}

describe("app providers", () => {
  afterEach(() => {
    sessionStorage.clear();
    document.cookie = `${SESSION_MARKER_COOKIE}=; Max-Age=0; path=/`;
    vi.restoreAllMocks();
  });

  it("renders children inside the foundation providers", () => {
    render(
      <AppProviders>
        <p>Ready</p>
      </AppProviders>,
    );
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(document.getElementById("app-announcer")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("clears scoped queries and locks register auth when the session signs out", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    await unlockRegister({
      tenantId: authSessionFixture.tenantId,
      registerId: "88888888-8888-4888-8888-888888888888",
      shiftId: "99999999-9999-4999-8999-999999999999",
      accessToken: "register-token",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(getRegisterAuthState().unlocked).toBe(true);

    render(
      <AppProviders>
        <p>Ready</p>
      </AppProviders>,
    );
    sessionManager.signOut();

    await vi.waitFor(() => {
      expect(getRegisterAuthState().unlocked).toBe(false);
    });
    expect(getRegisterAuthState().credential).toBeNull();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("locks register auth when another user signs in without sign-out", async () => {
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
    expect(getRegisterAuthState().unlocked).toBe(true);

    render(
      <AppProviders>
        <p>Ready</p>
      </AppProviders>,
    );

    sessionManager.setSession({
      ...authSessionFixture,
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "user-b-access",
      refreshToken: "user-b-refresh",
    });

    await vi.waitFor(() => {
      expect(getRegisterAuthState().unlocked).toBe(false);
    });
    expect(getRegisterAuthState().credential).toBeNull();
  });

  it("locks the remembered partition when cookie restore settles via setSession then markRestored", async () => {
    await seedUnlockedPartition();
    rememberRegisterPartition(tenantId, registerId);

    const claims = {
      sub: authSessionFixture.userId,
      tenantId,
      role: "Owner",
      permissions: ["Sell"],
      locationScope: [...authSessionFixture.locationScope],
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const accessToken = `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/`;
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ accessToken, refreshToken: "rotated-refresh" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as unknown as typeof fetch;
    const manager = new SessionManager({
      origin: "http://localhost:5088",
      fetchImpl,
    });

    render(
      <AppProviders manager={manager}>
        <p>Ready</p>
      </AppProviders>,
    );

    await vi.waitFor(async () => {
      expect(manager.getStatus()).toBe("authenticated");
      await expect(isRegisterPartitionLocked(tenantId, registerId)).resolves.toBe(true);
    });
  });
});
