import { afterEach, describe, expect, it, vi } from "vitest";
import { smoothScrollToElement } from "./smooth-scroll";

describe("smoothScrollToElement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls immediately when reduced motion is preferred", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    const element = document.createElement("section");
    element.getBoundingClientRect = () => ({
      top: 120,
      left: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.stubGlobal("scrollY", 0);

    smoothScrollToElement(element);

    expect(scrollTo).toHaveBeenCalledWith({ top: 120 });
  });

  it("animates scroll when motion is allowed", () => {
    const scrollTo = vi.fn();
    let rafCalls = 0;
    const raf = vi.fn((cb: FrameRequestCallback) => {
      rafCalls += 1;
      if (rafCalls === 1) cb(0);
      if (rafCalls === 2) cb(100);
      return rafCalls;
    });
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal("requestAnimationFrame", raf);
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    const element = document.createElement("section");
    element.getBoundingClientRect = () => ({
      top: 200,
      left: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.stubGlobal("scrollY", 0);

    smoothScrollToElement(element, 100);

    expect(raf).toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalled();
  });

  it("no-ops when distance is negligible", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    const element = document.createElement("section");
    element.getBoundingClientRect = () => ({
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.stubGlobal("scrollY", 0);

    smoothScrollToElement(element);

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("cancels stale animation frames when a new scroll starts", () => {
    const scrollTo = vi.fn();
    let rafCalls = 0;
    vi.stubGlobal("scrollTo", scrollTo);
    vi.stubGlobal("performance", { now: () => 0 });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCalls += 1;
      if (rafCalls === 1) cb(0);
      return rafCalls;
    });

    const first = document.createElement("section");
    const second = document.createElement("section");
    for (const element of [first, second]) {
      element.getBoundingClientRect = () => ({
        top: 300,
        left: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
    }
    vi.stubGlobal("scrollY", 0);

    smoothScrollToElement(first, 100);
    smoothScrollToElement(second, 100);

    expect(scrollTo).toHaveBeenCalled();
  });
});
