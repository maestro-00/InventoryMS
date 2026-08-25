import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./providers/app-shell";
import { RouteErrorBoundary } from "./providers/error-boundary";

function Boom(): null {
  throw new Error("shell exploded");
}

describe("app shell", () => {
  it("exposes keyboard-reachable navigation and a skip link", async () => {
    const user = userEvent.setup();
    render(
      <AppShell
        locationControl={<span className="text-sm text-muted-foreground">Accra Shop</span>}
        navigation={[
          { to: "/dashboard", label: "Dashboard" },
          { to: "/pos", label: "Sell" },
        ]}
      >
        <button type="button">Primary action</button>
      </AppShell>,
    );

    const skip = screen.getByRole("link", { name: /skip to content/i });
    expect(skip).toHaveAttribute("href", "#main-content");
    await user.tab();
    expect(skip).toHaveFocus();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("restores focus to the menu trigger after the drawer closes", async () => {
    const user = userEvent.setup();
    render(
      <AppShell
        locationControl={<span className="text-sm text-muted-foreground">Accra Shop</span>}
        navigation={[{ to: "/dashboard", label: "Dashboard" }]}
      >
        <p>Content</p>
      </AppShell>,
    );

    const trigger = screen.getByRole("button", {
      name: /open navigation/i,
      hidden: true,
    });
    await user.click(trigger);
    expect(
      await screen.findByRole("dialog", { name: /navigation/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /close navigation/i }));
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("does not overflow at 320px and respects reduced motion", () => {
    render(
      <AppShell
        locationControl={<span className="text-sm text-muted-foreground">Accra Shop</span>}
        navigation={[{ to: "/dashboard", label: "Dashboard" }]}
      >
        <p>Narrow content</p>
      </AppShell>,
    );
    const shell = screen.getByTestId("app-shell");
    expect(shell.className).toMatch(/overflow-x-hidden|max-w-full/);
    expect(document.documentElement.classList.contains("motion-safe")).toBe(false);
  });

  it("renders a route error boundary with recovery and a support reference", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(
      <RouteErrorBoundary traceId="00-trace-id">
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/support/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
  });

  it("renders children when the route has not thrown", () => {
    render(
      <RouteErrorBoundary>
        <p>Healthy</p>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });
});
