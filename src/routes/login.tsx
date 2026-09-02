import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LoginForm } from "../features/auth/login-form";
import { sessionFromTokens } from "../features/auth/session-bootstrap";
import { googleOAuthReturnUrl } from "../features/auth/api/auth-api";
import {
  LoginLeftPanel,
  PublicAuthLayout,
} from "../features/marketing/layout/public-auth-layout";
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
    const target = parseInternalRedirect(search.redirect);
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- router redirect
    throw redirect(
      target ? { to: target.to, search: target.search } : { to: "/dashboard" },
    );
  },
  component: LoginPage,
});

function LoginPage() {
  const target = internalRedirectTarget(Route.useSearch().redirect);
  const navigate = useNavigate();
  const { manager } = useSession();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const googleReturnUrl = googleOAuthReturnUrl(target);

  return (
    <PublicAuthLayout
      leftContent={<LoginLeftPanel />}
      rightContent={
        <>
          <h1 className="mb-1 text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in to your InventoryMS account
          </p>
          {sessionError ? (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {sessionError}
            </p>
          ) : null}
          <LoginForm
            returnUrl={googleReturnUrl}
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
          <p className="mt-6 text-center text-xs text-muted-foreground">
            New to InventoryMS?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create a business
            </Link>
          </p>
        </>
      }
    />
  );
}
