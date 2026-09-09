import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GoogleCallback } from "../../features/auth/google-callback";
import { sessionFromTokens } from "../../features/auth/session-bootstrap";
import { useSession } from "../../shared/auth/session-context";
import { parseInternalRedirect } from "../../shared/auth/redirect-target";

export const Route = createFileRoute("/auth/google-callback")({
  validateSearch: (search: Record<string, unknown>) => search,
  component: GoogleCallbackPage,
});

function GoogleCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { manager } = useSession();
  const [sessionError, setSessionError] = useState<string | null>(null);

  const clearOAuthSearch = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("accessToken");
    url.searchParams.delete("refreshToken");
    url.searchParams.delete("accessTokenExpiresAt");
    url.searchParams.delete("redirect");
    const cleanedSearch = url.searchParams.toString();
    const cleanedPath =
      url.pathname + (cleanedSearch ? `?${cleanedSearch}` : "") + url.hash;
    window.history.replaceState({}, "", cleanedPath);
  };

  return (
    <main id="main-content" className="mx-auto max-w-md p-6">
      {sessionError ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="rounded-md border border-destructive p-3 text-sm">
            {sessionError}
          </p>
          <Link to="/login">Back to sign in</Link>
        </div>
      ) : (
        <GoogleCallback
          search={search}
          onSignedIn={(outcome) => {
            const session = sessionFromTokens(outcome);
            clearOAuthSearch();
            if (!session) {
              setSessionError(
                "Google sign-in returned an account without a tenant or role. Ask an administrator to assign access, then try again.",
              );
              return;
            }
            manager.setSession(session);

            const redirectTarget =
              typeof search.redirect === "string" ? search.redirect : undefined;
            const destination = parseInternalRedirect(redirectTarget);
            void navigate(
              destination
                ? { to: destination.to, search: destination.search }
                : { to: "/dashboard" },
            );
          }}
        />
      )}
    </main>
  );
}
