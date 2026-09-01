import { describe, expect, it } from "vitest";
import { googleOAuthReturnUrl, googleSignInUrl } from "./auth-api";

describe("google OAuth return URL", () => {
  it("builds an absolute frontend callback URL for the provider returnUrl", () => {
    expect(googleOAuthReturnUrl(null, "http://localhost:5173")).toBe(
      "http://localhost:5173/auth/google-callback",
    );
  });

  it("preserves post-login redirect in the callback URL", () => {
    expect(googleOAuthReturnUrl("/dashboard", "http://localhost:5173")).toBe(
      "http://localhost:5173/auth/google-callback?redirect=%2Fdashboard",
    );
  });

  it("passes the absolute returnUrl to the Google challenge endpoint", () => {
    const href = googleSignInUrl("http://localhost:5173/auth/google-callback");
    expect(href).toContain("returnUrl=");
    expect(href).toContain(
      encodeURIComponent("http://localhost:5173/auth/google-callback"),
    );
  });

  it("drops unsafe post-login targets from the callback path", () => {
    expect(googleOAuthReturnUrl("//evil.example", "http://localhost:5173")).toBe(
      "http://localhost:5173/auth/google-callback",
    );
  });
});
