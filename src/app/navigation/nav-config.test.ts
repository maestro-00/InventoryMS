import { describe, expect, it } from "vitest";
import { buildNavigationGroups } from "./nav-config";
import { authSessionFixture } from "../../../tests/fixtures/domain";

describe("nav-config", () => {
  it("shows Sell and hides Setup for a cashier with completed onboarding", () => {
    const groups = buildNavigationGroups(
      {
        ...authSessionFixture,
        role: "Cashier",
        permissions: ["Sell", "Refund", "Discount"],
        locationScope: [...authSessionFixture.locationScope],
      },
      {
        businessProfile: true,
        location: true,
        product: true,
        openingStock: true,
        register: true,
        firstSale: true,
      },
    );

    const labels = groups.flatMap((group) => group.items.map((item) => item.label));
    expect(labels).toContain("Sell");
    expect(labels).toContain("Tills");
    expect(labels).not.toContain("Get started");
    expect(groups.some((group) => group.id === "setup")).toBe(false);
  });

  it("includes Locations and Products for stock managers", () => {
    const groups = buildNavigationGroups(
      {
        ...authSessionFixture,
        role: "Owner",
        permissions: ["Sell", "ManageStock", "ViewReports", "ManageUsers"],
        locationScope: [...authSessionFixture.locationScope],
      },
      {
        businessProfile: true,
        location: true,
        product: true,
        openingStock: true,
        register: true,
        firstSale: true,
      },
    );
    const labels = groups.flatMap((group) => group.items.map((item) => item.label));
    expect(labels).toEqual(
      expect.arrayContaining(["Locations", "Products", "Opening stock", "Tills"]),
    );
  });

  it("shows Get started for owners with incomplete onboarding", () => {
    const groups = buildNavigationGroups(
      {
        ...authSessionFixture,
        role: "Owner",
        permissions: ["Sell", "ManageStock", "ViewReports", "ManageUsers"],
        locationScope: [...authSessionFixture.locationScope],
      },
      { businessProfile: false },
    );

    expect(groups.some((group) => group.id === "setup")).toBe(true);
  });
});
