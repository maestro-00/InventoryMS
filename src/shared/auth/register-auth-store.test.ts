import { beforeEach, describe, expect, it } from "vitest";
import {
  getRegisterAuthState,
  isRegisterUnlocked,
  lockRegisterAuth,
  unlockRegister,
} from "./register-auth-store";

describe("register auth store", () => {
  beforeEach(() => {
    lockRegisterAuth();
  });

  it("wraps exchanged credentials and tracks unlock state", async () => {
    const exp = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await unlockRegister({
      tenantId: "22222222-2222-4222-8222-222222222222",
      registerId: "88888888-8888-4888-8888-888888888888",
      shiftId: "99999999-9999-4999-8999-999999999999",
      accessToken: "header.eyJleHAiOjIwMDB9.signature",
      expiresAt: exp,
    });

    expect(
      isRegisterUnlocked(
        "22222222-2222-4222-8222-222222222222",
        "88888888-8888-4888-8888-888888888888",
      ),
    ).toBe(true);
    expect(getRegisterAuthState().credential).not.toBeNull();
  });

  it("locks register auth and clears credentials", async () => {
    await unlockRegister({
      tenantId: "22222222-2222-4222-8222-222222222222",
      registerId: "88888888-8888-4888-8888-888888888888",
      shiftId: "99999999-9999-4999-8999-999999999999",
      accessToken: "token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    lockRegisterAuth();

    expect(getRegisterAuthState().unlocked).toBe(false);
    expect(getRegisterAuthState().credential).toBeNull();
  });
});
