import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DashboardPreview,
  FeaturePreview,
  LogoMarquee,
  MarketingAtmosphere,
  MarketingDisplayHeading,
  MarketingEyebrow,
} from "./marketing-ui";

describe("marketing-ui", () => {
  it("renders atmosphere and typography helpers", () => {
    render(
      <MarketingAtmosphere>
        <MarketingEyebrow>InventoryX</MarketingEyebrow>
        <MarketingDisplayHeading>Run your shop</MarketingDisplayHeading>
      </MarketingAtmosphere>,
    );

    expect(screen.getByText("InventoryX")).toBeInTheDocument();
    expect(screen.getByText("Run your shop")).toBeInTheDocument();
  });

  it("renders light atmosphere variant", () => {
    const { container } = render(
      <MarketingAtmosphere variant="light">
        <p>Light surface</p>
      </MarketingAtmosphere>,
    );

    expect(screen.getByText("Light surface")).toBeInTheDocument();
    expect(container.querySelector(".marketing-grid-light")).toBeTruthy();
  });

  it("renders an optional decorative background image", () => {
    const { container } = render(
      <MarketingAtmosphere
        backgroundImage="/images/marketing/test.webp"
        imagePosition="center right"
      >
        <p>Foreground content</p>
      </MarketingAtmosphere>,
    );

    const image = screen.getByRole("presentation");
    expect(image).toHaveAttribute("src", "/images/marketing/test.webp");
    expect(image).toHaveStyle({ objectPosition: "center right" });
    expect(container.querySelector(".marketing-grid-navy")).toBeNull();
  });

  it("renders dashboard preview and logo marquee", () => {
    render(
      <>
        <DashboardPreview />
        <LogoMarquee logos={["Acme"]} />
      </>,
    );

    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    expect(screen.getByText("GHS 28.4k")).toBeInTheDocument();
  });

  it("renders feature preview sections", () => {
    for (const sectionId of ["inventory", "offline", "staff"]) {
      const { container, unmount } = render(<FeaturePreview sectionId={sectionId} />);
      expect(container.firstChild).toBeTruthy();
      unmount();
    }

    render(<FeaturePreview sectionId="unknown-section" />);
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });
});
