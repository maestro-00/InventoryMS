import { describe, expect, it } from "vitest";
import {
  shouldBlockOfflineCompletion,
  shouldDeferServiceWorkerUpdate,
  STORAGE_CLEANUP_ORDER,
} from "./storage-pressure";

describe("storage pressure helpers", () => {
  it("never auto-deletes the financial queue", () => {
    expect(STORAGE_CLEANUP_ORDER.at(-1)).toBe("never-queue");
  });

  it("blocks offline completion near quota", () => {
    expect(
      shouldBlockOfflineCompletion({
        usage: 90,
        quota: 100,
        estimatedSaleBytes: 6,
      }),
    ).toBe(true);
    expect(
      shouldBlockOfflineCompletion({
        usage: 10,
        quota: 100,
        estimatedSaleBytes: 1,
      }),
    ).toBe(false);
    expect(
      shouldBlockOfflineCompletion({
        usage: 10,
        quota: Number.NaN,
        estimatedSaleBytes: 1,
      }),
    ).toBe(false);
    expect(
      shouldBlockOfflineCompletion({
        usage: 10,
        quota: 0,
        estimatedSaleBytes: 1,
      }),
    ).toBe(false);
  });

  it("defers SW updates for open shifts or pending sales", () => {
    expect(
      shouldDeferServiceWorkerUpdate({ hasActiveShift: true, pendingOfflineSales: 0 }),
    ).toBe(true);
    expect(
      shouldDeferServiceWorkerUpdate({ hasActiveShift: false, pendingOfflineSales: 2 }),
    ).toBe(true);
    expect(
      shouldDeferServiceWorkerUpdate({ hasActiveShift: false, pendingOfflineSales: 0 }),
    ).toBe(false);
  });
});
