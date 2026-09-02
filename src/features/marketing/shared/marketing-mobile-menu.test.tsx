import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithRouter } from "@/shared/test/render-router";
import { MarketingMobileMenu } from "./marketing-mobile-menu";

describe("MarketingMobileMenu", () => {
  it("opens the sheet and marks the active page", async () => {
    const user = userEvent.setup();
    renderWithRouter(<MarketingMobileMenu activePage="pricing" />);

    await user.click(screen.getByRole("button", { name: /open menu/i }));

    const pricingLink = screen.getByRole("link", { name: "Pricing" });
    expect(pricingLink).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Sign in" }));
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });
});
