import { describe, expect, it } from "vitest";
import {
  authSessionFixture,
  permissionMatrixFixture,
} from "../../../tests/fixtures/domain";
import {
  evaluateAccess,
  hasPermission,
  type AccessInput,
  type SessionSnapshot,
} from "./access-policy";

const owner: SessionSnapshot = {
  userId: authSessionFixture.userId,
  tenantId: authSessionFixture.tenantId,
  role: authSessionFixture.role,
  permissions: [...permissionMatrixFixture.Owner],
  locationScope: [...authSessionFixture.locationScope],
  expiresAt: authSessionFixture.expiresAt,
};

const cashier: SessionSnapshot = {
  userId: authSessionFixture.userId,
  tenantId: authSessionFixture.tenantId,
  role: "Cashier",
  permissions: [...permissionMatrixFixture.Cashier],
  locationScope: [...authSessionFixture.locationScope],
  expiresAt: authSessionFixture.expiresAt,
};

function evaluate(overrides: Partial<AccessInput> = {}) {
  const input: AccessInput = {
    session: owner,
    isOnline: true,
    subscriptionStatus: "Active",
  };
  if (owner.locationScope[0]) input.locationId = owner.locationScope[0];
  return evaluateAccess({ ...input, ...overrides });
}

describe("access policy", () => {
  it("denies missing sessions before any other gate", () => {
    const result = evaluate({ session: null, requiredPermissions: ["Sell"] });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("unauthenticated");
    expect(result.destination).toBe("/login");
  });

  it("keeps view, billing, and export available in read-only subscription", () => {
    const readable = evaluate({
      subscriptionStatus: "ReadOnly",
      requiredPermissions: ["ViewReports"],
    });
    expect(readable.allowed).toBe(true);

    const mutation = evaluate({
      subscriptionStatus: "ReadOnly",
      requiredPermissions: ["ManageStock"],
      mutation: true,
    });
    expect(mutation.allowed).toBe(false);
    expect(mutation.reason).toBe("readOnly");
  });

  it("requires permission atoms and assigned location scope", () => {
    expect(
      evaluate({
        session: cashier,
        requiredPermissions: ["ViewProfit"],
      }).reason,
    ).toBe("forbidden");

    expect(
      evaluate({
        session: cashier,
        requiredPermissions: ["Sell"],
        locationId: "00000000-0000-4000-8000-000000000000",
      }).reason,
    ).toBe("location");
  });

  it("requires an open register for POS and blocks live-only work while offline", () => {
    const noRegister = evaluate({
      requiredPermissions: ["Sell"],
      requireRegister: true,
    });
    expect(noRegister.reason).toBe("register");

    const offlineLive = evaluate({
      requiredPermissions: ["Sell"],
      requireOnline: true,
      isOnline: false,
    });
    expect(offlineLive.allowed).toBe(false);
    expect(offlineLive.reason).toBe("offline");
  });

  it("surfaces plan-locked features without rendering a fake empty state", () => {
    const result = evaluate({
      requiredPlanFeature: "advancedPurchasing",
      planFeatures: ["basicPos"],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("planLimit");
  });

  it("treats read-only stock mutations as blocked even without an explicit mutation flag", () => {
    const result = evaluate({
      subscriptionStatus: "ReadOnly",
      requiredPermissions: ["ManageStock"],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("readOnly");
  });

  it("allows an assigned plan feature and reports permission atoms", () => {
    expect(
      evaluate({
        requiredPlanFeature: "basicPos",
        planFeatures: ["basicPos"],
      }).allowed,
    ).toBe(true);
    expect(hasPermission(owner, "Sell")).toBe(true);
    expect(hasPermission(null, "Sell")).toBe(false);
  });
});
