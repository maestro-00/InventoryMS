import { describe, expect, it } from "vitest";
import { staffScopeQueryPrefixes } from "./api/staff-api";

describe("staff access scope", () => {
  it("lists query prefixes cleared when location scope changes", () => {
    expect(staffScopeQueryPrefixes()).toEqual(
      expect.arrayContaining(["staff", "locations", "inventory", "reports"]),
    );
  });

  it("explains fixed cycle-1 roles without inventing custom roles", () => {
    const roles = ["Owner", "Administrator", "Manager", "Cashier", "Accountant"];
    expect(roles).not.toContain("Custom");
    expect(roles).toContain("Cashier");
  });
});
