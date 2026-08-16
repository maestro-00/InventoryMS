import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GoogleCallback } from "../../features/auth/google-callback";
import { sessionFromTokens } from "../../features/auth/session-bootstrap";
import { useSession } from "../../shared/auth/session-context";

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
          void navigate({ to: "/dashboard" });
        }}
      />
    </main>
  );
}
