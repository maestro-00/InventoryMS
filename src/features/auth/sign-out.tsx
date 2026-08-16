import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../shared/ui/button";
import { useSession } from "../../shared/auth/session-context";

/**
 * Signing out clears the in-memory session, cancels and drops every scoped query, and
 * locks any register credential held for offline selling.
 */
export function SignOutButton({ onSignedOut }: { onSignedOut?: () => void }) {
  const { manager } = useSession();
  const queryClient = useQueryClient();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        manager.signOut();
        void queryClient.cancelQueries();
        queryClient.removeQueries();
        onSignedOut?.();
      }}
    >
      Sign out
    </Button>
  );
}
