import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { authSessionFixture } from "../../../tests/fixtures/domain";
import { sessionManager } from "../../shared/auth/session-manager";
import {
  getRegisterAuthState,
  unlockRegister,
} from "../../shared/auth/register-auth-store";
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

  it("clears scoped queries and locks register auth when the session signs out", async () => {
    sessionManager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    await unlockRegister({
      tenantId: authSessionFixture.tenantId,
      registerId: "88888888-8888-4888-8888-888888888888",
      shiftId: "99999999-9999-4999-8999-999999999999",
      accessToken: "register-token",
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(getRegisterAuthState().unlocked).toBe(true);

    render(
      <AppProviders>
        <p>Ready</p>
      </AppProviders>,
    );
    sessionManager.signOut();

    expect(getRegisterAuthState().unlocked).toBe(false);
    expect(getRegisterAuthState().credential).toBeNull();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
