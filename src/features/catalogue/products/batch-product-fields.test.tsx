import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BatchProductFields } from "./batch-product-fields";

describe("BatchProductFields", () => {
  it("renders nothing when batch tracking is disabled", () => {
    const { container } = render(<BatchProductFields enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders FEFO and expiry defaults when enabled", () => {
    render(<BatchProductFields enabled />);
    expect(screen.getByText(/batch tracking/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default fefo/i)).toBeChecked();
    expect(screen.getByLabelText(/require expiry date/i)).toBeChecked();
  });
});
