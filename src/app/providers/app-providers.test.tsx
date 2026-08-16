import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { authSessionFixture } from "../../../tests/fixtures/domain";
import { sessionManager } from "../../shared/auth/session-manager";
import { AppProviders } from "./app-providers";

describe("app providers", () => {
  it("renders children inside the foundation providers", () => {
    render(
      <AppProviders>
        <p>Ready</p>
      </AppProviders>,
    );
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(document.getElementById("app-announcer")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("clears scoped queries when the session signs out", () => {
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    render(
      <AppProviders>
        <p>Ready</p>
      </AppProviders>,
    );
    sessionManager.signOut();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
