import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  publishSyncStatus,
  syncChannelName,
  syncLockName,
  withSyncLeadership,
} from "./sync-leader";

describe("sync leadership", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("names locks and channels per tenant/register", () => {
    expect(syncLockName("t1", "r1")).toBe("inventoryms-sync:t1:r1");
    expect(syncChannelName("t1", "r1")).toBe("inventoryms-sync-bus:t1:r1");
  });

  it("runs work immediately when locks API is unavailable", async () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, "locks");
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    try {
      const result = await withSyncLeadership("t", "r", () => Promise.resolve("ok"));
      expect(result).toBe("ok");
    } finally {
      if (previous) Object.defineProperty(navigator, "locks", previous);
      else Reflect.deleteProperty(navigator, "locks");
    }
  });

  it("returns null when another tab already holds the lock", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: vi.fn(
          (
            _name: string,
            _opts: unknown,
            callback: (lock: unknown) => Promise<string | null>,
          ) => callback(null),
        ),
      },
    });
    const result = await withSyncLeadership("t", "r", () => Promise.resolve("leader"));
    expect(result).toBeNull();
  });

  it("runs work while holding an available lock", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: vi.fn(
          (
            _name: string,
            _opts: unknown,
            callback: (lock: { name: string }) => Promise<string | null>,
          ) => callback({ name: "held" }),
        ),
      },
    });
    const result = await withSyncLeadership("t", "r", (signal) => {
      expect(signal.aborted).toBe(false);
      return Promise.resolve("leader");
    });
    expect(result).toBe("leader");
  });

  it("publishes status over BroadcastChannel when available", () => {
    const postMessage = vi.fn();
    const close = vi.fn();
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        postMessage = postMessage;
        close = close;
      },
    );
    publishSyncStatus("t", "r", { type: "status", leader: true, pending: 2 });
    expect(postMessage).toHaveBeenCalledWith({
      type: "status",
      leader: true,
      pending: 2,
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("no-ops publish when BroadcastChannel is missing", () => {
    const previous = globalThis.BroadcastChannel;
    // @ts-expect-error intentional absence
    delete globalThis.BroadcastChannel;
    expect(() => {
      publishSyncStatus("t", "r", { type: "request-leadership" });
    }).not.toThrow();
    globalThis.BroadcastChannel = previous;
  });
});
