import { describe, expect, it, beforeEach } from "vitest";
import {
  getActiveLocationId,
  initializeActiveLocation,
  resetActiveLocation,
  resolveActiveLocationId,
  setActiveLocationId,
} from "./active-location-store";

describe("active location store", () => {
  beforeEach(() => {
    resetActiveLocation();
    sessionStorage.clear();
  });

  it("does not reuse another tenant's in-memory location", () => {
    setActiveLocationId("tenant-a", "loc-a");
    expect(getActiveLocationId()).toBe("loc-a");

    const resolved = resolveActiveLocationId({
      tenantId: "tenant-b",
      locationScope: ["loc-b"],
      locationIds: ["loc-b"],
    });
    expect(resolved).toBe("loc-b");
  });

  it("ignores stored ids outside location scope", () => {
    setActiveLocationId("tenant-a", "out-of-scope");
    const resolved = resolveActiveLocationId({
      tenantId: "tenant-a",
      locationScope: ["allowed"],
      locationIds: ["allowed", "out-of-scope"],
    });
    expect(resolved).toBe("allowed");
  });

  it("initialize is a no-op when selection is unchanged", () => {
    const first = initializeActiveLocation({
      tenantId: "tenant-a",
      locationScope: ["*"],
      locationIds: ["loc-1"],
    });
    const second = initializeActiveLocation({
      tenantId: "tenant-a",
      locationScope: ["*"],
      locationIds: ["loc-1"],
    });
    expect(first).toBe("loc-1");
    expect(second).toBe("loc-1");
    expect(getActiveLocationId()).toBe("loc-1");
  });
});
