import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "@/shared/test/render-router";
import { smoothScrollToElement } from "@/shared/utils/smooth-scroll";
import { FEATURE_SECTIONS } from "../shared/marketing-content";
import { FeaturesPage } from "./features-page";

vi.mock("@/shared/utils/smooth-scroll", () => ({
  smoothScrollToElement: vi.fn(),
}));

describe("FeaturesPage", () => {
  beforeEach(() => {
    window.location.hash = "";
    class MockIntersectionObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders feature sections and navigates on jump links", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");

    renderWithRouter(<FeaturesPage />);

    expect(
      screen.getByRole("heading", {
        name: /everything you need to run sales and stock/i,
      }),
    ).toBeInTheDocument();

    const target = FEATURE_SECTIONS[1];
    const link = screen.getByRole("link", { name: target.title });
    await user.click(link);

    expect(replaceState).toHaveBeenCalledWith(null, "", `#${target.id}`);
    expect(link).toHaveAttribute("aria-current", "true");
    expect(smoothScrollToElement).toHaveBeenCalled();
  });

  it("scrolls to hash section on initial load", () => {
    window.location.hash = `#${FEATURE_SECTIONS[0].id}`;

    renderWithRouter(<FeaturesPage />);

    expect(smoothScrollToElement).toHaveBeenCalled();
  });
});
