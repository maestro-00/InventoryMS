import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithProviders } from "../../shared/test/render";
import { renderWithRouter } from "../../shared/test/render-router";
import { RegistrationForm } from "./registration-form";
import { LoginForm } from "./login-form";
import { GoogleCallback } from "./google-callback";
import { SignOutButton } from "./sign-out";
import {
  registerTenantResult,
  loginResult,
  twoFactorRequiredProblem,
  validationProblem,
} from "../../../tests/fixtures/provider/us1";

describe("registration form", () => {
  it("creates the business and reports the trial subscription", async () => {
    const user = userEvent.setup();
    const onRegistered = vi.fn();
    server.use(
      http.post("*/api/v1/auth/register", () =>
        HttpResponse.json(registerTenantResult, { status: 201 }),
      ),
    );

    renderWithProviders(<RegistrationForm onRegistered={onRegistered} />, {
      session: null,
    });

    await user.type(screen.getByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.type(screen.getByLabelText(/business name/i), "Kwame Provisions");
    await user.click(screen.getByRole("button", { name: /create business/i }));

    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptionStatus: "Trialing" }),
      );
    });
    expect(await screen.findByText(/14-day Professional trial/i)).toBeInTheDocument();
  });

  it("keeps the entered values and shows server field errors", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/auth/register", () =>
        HttpResponse.json(
          {
            ...validationProblem,
            errors: { email: ["That email is already in use."] },
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithProviders(<RegistrationForm onRegistered={vi.fn()} />, { session: null });

    await user.type(screen.getByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.type(screen.getByLabelText(/business name/i), "Kwame Provisions");
    await user.click(screen.getByRole("button", { name: /create business/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That email is already in use.");
    expect(screen.getByLabelText(/business name/i)).toHaveValue("Kwame Provisions");
  });

  it("blocks a duplicate submit while the request is in flight", async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.post("*/api/v1/auth/register", async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 40));
        return HttpResponse.json(registerTenantResult, { status: 201 });
      }),
    );

    renderWithProviders(<RegistrationForm onRegistered={vi.fn()} />, { session: null });

    await user.type(screen.getByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.type(screen.getByLabelText(/business name/i), "Kwame Provisions");
    const submit = screen.getByRole("button", { name: /create business/i });
    await user.click(submit);
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText(/14-day Professional trial/i)).toBeInTheDocument();
    });
    expect(calls).toBe(1);
  });

  it("reports client-side validation before contacting the provider", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegistrationForm onRegistered={vi.fn()} />, { session: null });

    await user.click(screen.getByRole("button", { name: /create business/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
  });
});

describe("login form", () => {
  it("signs in with email and password", async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();
    server.use(http.post("*/api/v1/auth/login", () => HttpResponse.json(loginResult)));

    renderWithProviders(<LoginForm onSignedIn={onSignedIn} />, { session: null });

    await user.type(screen.getByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: "provider-access-token" }),
      );
    });
  });

  it("moves to the two-factor challenge and focuses the code field", async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();
    server.use(
      http.post("*/api/v1/auth/login", ({ request }) =>
        request.headers.get("X-Test-Stage") === "verified"
          ? HttpResponse.json(loginResult)
          : HttpResponse.json(twoFactorRequiredProblem, {
              status: 423,
              headers: { "Content-Type": "application/problem+json" },
            }),
      ),
    );

    renderWithProviders(<LoginForm onSignedIn={onSignedIn} />, { session: null });

    await user.type(screen.getByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "Str0ng-Passphrase!");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    const code = await screen.findByLabelText(/authentication code/i);
    await waitFor(() => {
      expect(code).toHaveFocus();
    });
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it("offers Google sign-in as a provider-hosted link with an absolute return URL", () => {
    renderWithProviders(<LoginForm onSignedIn={vi.fn()} />, { session: null });

    const link = screen.getByRole("link", { name: /continue with google/i });
    const expectedReturnUrl = `${window.location.origin}/auth/google-callback`;
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("/api/v1/auth/google"),
    );
    expect(link.getAttribute("href")).toContain(encodeURIComponent(expectedReturnUrl));
  });

  it("shows the normalized problem when credentials are rejected", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json(
          { title: "Invalid credentials", status: 401, traceId: "trace-401" },
          { status: 401, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithProviders(<LoginForm onSignedIn={vi.fn()} />, { session: null });

    await user.type(screen.getByLabelText(/email/i), "owner@kwame.gh");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid credentials");
    expect(alert).toHaveTextContent("trace-401");
  });
});

describe("google callback", () => {
  it("hands a returned session to the caller", async () => {
    const onSignedIn = vi.fn();
    renderWithRouter(
      <GoogleCallback
        search={{
          accessToken: "google-access",
          refreshToken: "google-refresh",
          accessTokenExpiresAt: "2026-08-13T12:00:00.000Z",
        }}
        onSignedIn={onSignedIn}
      />,
      { session: null },
    );

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: "google-access" }),
      );
    });
  });

  it("recovers when the provider returns no usable session", () => {
    renderWithRouter(<GoogleCallback search={{}} onSignedIn={vi.fn()} />, {
      session: null,
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/could not be completed/i);
    expect(screen.getByRole("link", { name: /back to sign in/i })).toBeInTheDocument();
  });
});

describe("sign out", () => {
  it("clears the session and locks register credentials", async () => {
    const user = userEvent.setup();
    const onSignedOut = vi.fn();

    renderWithProviders(<SignOutButton onSignedOut={onSignedOut} />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(onSignedOut).toHaveBeenCalledTimes(1);
  });
});
