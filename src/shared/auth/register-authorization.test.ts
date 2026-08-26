import { describe, expect, it } from "vitest";
import {
  canUnlockPartition,
  earliestDeadline,
  isPastDeadline,
  lockRegisterPartition,
  unwrapRegisterCredential,
  wrapRegisterCredential,
  type RegisterAuthorizationState,
} from "./register-authorization";

describe("register authorization", () => {
  it("picks the earliest of credential, shift close, and 12h cap", () => {
    const authorizedAt = "2026-08-13T00:00:00.000Z";
    const credentialExpiresAt = "2026-08-13T20:00:00.000Z";
    const withShift = earliestDeadline(
      credentialExpiresAt,
      "2026-08-13T06:00:00.000Z",
      authorizedAt,
    );
    expect(withShift).toBe("2026-08-13T06:00:00.000Z");
    const withoutShift = earliestDeadline(credentialExpiresAt, null, authorizedAt);
    expect(withoutShift).toBe("2026-08-13T12:00:00.000Z");
  });

  it("locks partitions and checks unlock eligibility", () => {
    const state: RegisterAuthorizationState = {
      unlocked: true,
      tenantId: "t1",
      registerId: "r1",
      shiftId: "s1",
      deadline: "2026-08-13T12:00:00.000Z",
      credential: null,
    };
    expect(canUnlockPartition(state, "t1", "r1")).toBe(true);
    expect(canUnlockPartition(state, "t2", "r1")).toBe(false);
    expect(lockRegisterPartition(state)).toMatchObject({
      unlocked: false,
      credential: null,
      shiftId: "",
      deadline: state.deadline,
    });
  });

  it("detects past deadlines", () => {
    expect(isPastDeadline(null)).toBe(true);
    expect(isPastDeadline("2099-01-01T00:00:00.000Z")).toBe(false);
    expect(isPastDeadline("2000-01-01T00:00:00.000Z")).toBe(true);
  });

  it("wraps and unwraps register credentials with web crypto", async () => {
    const wrapped = await wrapRegisterCredential({
      tenantId: "11111111-1111-4111-8111-111111111111",
      registerId: "22222222-2222-4222-8222-222222222222",
      token: "register-token",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(wrapped.tenantId).toBe("11111111-1111-4111-8111-111111111111");
    expect(wrapped.ciphertext.byteLength).toBeGreaterThan(0);
    expect(wrapped.iv).toHaveLength(12);
    expect(wrapped.wrappedKey.byteLength).toBeGreaterThan(0);
    await expect(unwrapRegisterCredential(wrapped)).resolves.toBe("register-token");
  });
});
