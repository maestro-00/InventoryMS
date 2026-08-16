import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LoginForm } from "../features/auth/login-form";
import { sessionFromTokens } from "../features/auth/session-bootstrap";
import {
  internalRedirectTarget,
  parseInternalRedirect,
} from "../shared/auth/redirect-target";
import { useSession } from "../shared/auth/session-context";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const target = search["redirect"];
    return typeof target === "string" ? { redirect: target } : {};
  },
  beforeLoad: async ({ context, search }) => {
    await context.sessionManager.whenRestored();
    if (!context.sessionManager.getSnapshot()) return;
    // Already signed in: showing the form here is what left users staring at a sign-in
    // page while their session was still valid.
    const target = parseInternalRedirect(search.redirect);
    // TanStack Router uses thrown redirects as control flow.
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
    throw redirect(
      target ? { to: target.to, search: target.search } : { to: "/dashboard" },
    );
  },
  component: LoginPage,
});

function LoginPage() {
  // Sanitized here rather than in `validateSearch` so a crafted `?redirect=` can never
  // reach the provider-hosted Google flow as a `returnUrl`.
  const target = internalRedirectTarget(Route.useSearch().redirect);
  const navigate = useNavigate();
  const { manager } = useSession();
  const [sessionError, setSessionError] = useState<string | null>(null);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6"
    >
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {sessionError ? (
        <p role="alert" className="text-sm text-destructive">
          {sessionError}
        </p>
      ) : null}
      <LoginForm
        returnUrl={target ?? "/dashboard"}
        onSignedIn={(outcome) => {
          const session = sessionFromTokens(outcome);
          if (!session) {
            setSessionError(
              "Signed in, but the access token is missing required claims. Try again or contact support.",
            );
            return;
          }
          setSessionError(null);
          manager.setSession(session);
          const destination = parseInternalRedirect(target ?? undefined);
          void navigate(
            destination
              ? { to: destination.to, search: destination.search }
              : { to: "/dashboard" },
          );
        }}
      />
      <p>
        New to InventoryMS? <Link to="/register">Create a business</Link>
      </p>
    </main>
  );
}
