import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { BillingPlan } from "../../billing/api/billing-queries";
import { renderWithRouter } from "@/shared/test/render-router";
import { PricingPage } from "./pricing-page";

const apiPlans: BillingPlan[] = [
  {
    id: "1",
    name: "Starter",
    tier: "starter",
    monthlyPrice: 100,
    annualPrice: 1000,
    limits: { locations: 1, products: 500 },
  },
  {
    id: "2",
    name: "Growth",
    tier: "standard",
    monthlyPrice: 249,
    annualPrice: 2490,
    limits: { locations: 3 },
  },
  {
    id: "3",
    name: "Scale",
    tier: "pro",
    monthlyPrice: "499",
    limits: { products: null },
  },
];

describe("PricingPage", () => {
  it("renders fallback plans when API plans are missing", () => {
    renderWithRouter(<PricingPage />);

    expect(screen.getByText("Simple, predictable pricing")).toBeInTheDocument();
    expect(screen.getByText("GHS 249")).toBeInTheDocument();
  });

  it("switches billing cycle and maps API plans", async () => {
    const user = userEvent.setup();
    renderWithRouter(<PricingPage plans={apiPlans} />);

    expect(screen.getByText("GHS 100")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /annual/i }));

    expect(screen.getByText("GHS 1,000")).toBeInTheDocument();
    expect(screen.getByText(/Unlimited products/i)).toBeInTheDocument();
  });
});
