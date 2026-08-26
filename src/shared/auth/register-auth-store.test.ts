import { beforeEach, describe, expect, it } from "vitest";
import { authSessionFixture } from "../../../tests/fixtures/domain";
import { sessionManager } from "./session-manager";
import {
  getRegisterAccessToken,
  getRegisterAuthState,
  isRegisterUnlockedForShift,
  lockRegisterAuth,
  unlockRegister,
} from "./register-auth-store";

const tenantId = authSessionFixture.tenantId;
const registerId = "88888888-8888-4888-8888-888888888888";
const shiftId = "99999999-9999-4999-8999-999999999999";

describe("register auth store", () => {
  beforeEach(async () => {
    sessionManager.signOut();
    await lockRegisterAuth({ persistPartition: false });
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "user-access",
      refreshToken: "user-refresh",
    });
  });

  it("wraps exchanged credentials and tracks unlock state", async () => {
    const exp = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await unlockRegister({
      tenantId,
      registerId,
      shiftId,
      accessToken: "register-access-token",
      expiresAt: exp,
    });

    expect(isRegisterUnlockedForShift(tenantId, registerId, shiftId)).toBe(true);
    expect(
      isRegisterUnlockedForShift(
        tenantId,
        registerId,
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ),
    ).toBe(false);
    expect(getRegisterAuthState().credential).not.toBeNull();
    await expect(getRegisterAccessToken()).resolves.toBe("register-access-token");
    await expect(getRegisterAccessToken({ shiftId })).resolves.toBe(
      "register-access-token",
    );
    await expect(getRegisterAccessToken({ registerId })).resolves.toBe(
      "register-access-token",
    );
    await expect(
      getRegisterAccessToken({ shiftId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
    ).resolves.toBeNull();
    await expect(
      getRegisterAccessToken({
        registerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).resolves.toBeNull();
  });

  it("locks register auth and clears credentials", async () => {
    await unlockRegister({
      tenantId,
      registerId,
      shiftId,
      accessToken: "token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    await lockRegisterAuth({ persistPartition: false });

    expect(getRegisterAuthState().unlocked).toBe(false);
    expect(getRegisterAuthState().credential).toBeNull();
    await expect(getRegisterAccessToken()).resolves.toBeNull();
  });

  it("refuses register tokens when the active session tenant does not match", async () => {
    await unlockRegister({
      tenantId,
      registerId,
      shiftId,
      accessToken: "register-access-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    sessionManager.setSession({
      ...authSessionFixture,
      tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "other-user",
      refreshToken: "other-refresh",
    });

    await expect(getRegisterAccessToken()).resolves.toBeNull();
  });
});
