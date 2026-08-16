import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { rfc7807Problem } from "../../../../tests/fixtures/domain";
import { parseAppProblem } from "../../api/errors/app-problem";
import { renderWithRouter } from "../../test/render-router";
import {
  ApprovalRequiredState,
  ConfirmAction,
  DenialState,
  EmptyState,
  FilteredEmptyState,
  LoadingState,
  NotFoundState,
  PlanLimitState,
  RateLimitState,
  ReadOnlyState,
  StaleConflictState,
  ValidationSummary,
} from "./ui-state";

describe("UI states", () => {
  it("renders a stable loading status without enabling stale actions", () => {
    render(<LoadingState label="Loading products" actionLabel="Create product" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    expect(screen.getByRole("button", { name: "Create product" })).toBeDisabled();
  });

  it("renders confirmation grouping without a loading action", () => {
    const { rerender } = render(<LoadingState label="Loading locations" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading locations");
    rerender(
      <ConfirmAction label="Discard sale">
        <button type="button">Discard</button>
      </ConfirmAction>,
    );
    expect(screen.getByRole("group", { name: "Discard sale" })).toBeInTheDocument();
  });

  it("explains empty collections and filtered no-results separately", () => {
    const { rerender } = render(
      <EmptyState
        title="No products yet"
        actionLabel="Add product"
        onAction={() => undefined}
      />,
    );
    expect(screen.getByText("No products yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add product" })).toBeEnabled();

    rerender(
      <FilteredEmptyState
        title="No products match these filters"
        onReset={() => undefined}
      />,
    );
    expect(screen.getByText("No products match these filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeEnabled();
  });

  it("links validation, denial, stale, approval, read-only, and rate-limit recoveries", async () => {
    const user = userEvent.setup();
    const problem = parseAppProblem({ status: 400, body: rfc7807Problem });
    // Denial and approval recoveries link to routes, so they need the router in scope.
    const { rerender } = renderWithRouter(<ValidationSummary problem={problem} />);
    expect(screen.getByRole("alert")).toHaveTextContent("SKU");

    rerender(<DenialState destination="/dashboard" />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();

    rerender(
      <StaleConflictState
        currentValue="Server name"
        draftValue="Local name"
        onReload={() => undefined}
      />,
    );
    expect(screen.getByText(/Server name/)).toBeInTheDocument();
    expect(screen.getByText(/Local name/)).toBeInTheDocument();

    rerender(<ApprovalRequiredState href="/inventory/adjustments" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/inventory/adjustments");

    rerender(<ReadOnlyState upgradeHint="Upgrade to Professional" />);
    expect(screen.getByText(/Upgrade to Professional/)).toBeInTheDocument();

    rerender(<RateLimitState retryAfterSeconds={12} onRetry={() => undefined} />);
    expect(screen.getByRole("button", { name: /retry/i })).toBeDisabled();
    expect(screen.getByText(/12/)).toBeInTheDocument();

    rerender(<NotFoundState resource="Product" />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
    expect(screen.queryByText(/no products yet/i)).not.toBeInTheDocument();

    rerender(<PlanLimitState limit="3 locations" current="3" />);
    expect(screen.getByText(/3 locations/)).toBeInTheDocument();

    await user.tab();
  });
});
