import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { billingPlansFixture } from "../../../../tests/fixtures/billing-plans";
import { renderWithRouter } from "@/shared/test/render-router";
import { PricingPage } from "./pricing-page";

describe("PricingPage", () => {
  it("shows a retryable error instead of hardcoded fallback prices", () => {
    renderWithRouter(<PricingPage isError onRetry={() => undefined} />);

    expect(screen.getByText("Simple, predictable pricing")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/unavailable/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText("GHS 249")).not.toBeInTheDocument();
  });

  it("renders three self-serve plans plus a contact-sales card from the API", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PricingPage plans={billingPlansFixture} />);

    expect(screen.getByText("GHS 0")).toBeInTheDocument();
    expect(screen.getByText("GHS 249")).toBeInTheDocument();
    expect(screen.getByText("GHS 499")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    const contactLinks = screen.getAllByRole("link", { name: /contact sales/i });
    expect(contactLinks.length).toBeGreaterThanOrEqual(1);
    expect(contactLinks[0]).toHaveAttribute("href", expect.stringMatching(/^mailto:/));
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Standard").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Professional").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Business").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /start free trial/i }).length,
    ).toBeGreaterThanOrEqual(3);

    await user.click(screen.getByRole("button", { name: /annual/i }));

    expect(screen.getByText("GHS 2,390")).toBeInTheDocument();
    expect(screen.getAllByText(/Unlimited products/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /compare plans/i })).toBeInTheDocument();
    expect(screen.getAllByText("Locations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unlimited").length).toBeGreaterThan(0);
  });
});
