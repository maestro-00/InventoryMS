import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

  return (
    <main id="main-content" className="mx-auto max-w-md p-6">
      <GoogleCallback
        search={search}
        onSignedIn={(outcome) => {
          const session = sessionFromTokens(outcome);
          if (!session) return;
          manager.setSession(session);

          const url = new URL(window.location.href);
          url.searchParams.delete("accessToken");
          url.searchParams.delete("refreshToken");
          url.searchParams.delete("accessTokenExpiresAt");
          const cleanedSearch = url.searchParams.toString();
          const cleanedPath =
            url.pathname + (cleanedSearch ? `?${cleanedSearch}` : "") + url.hash;
          window.history.replaceState({}, "", cleanedPath);

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
    </main>
  );
}
