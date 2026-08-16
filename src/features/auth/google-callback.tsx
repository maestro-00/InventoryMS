import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { z } from "zod";
import type { LoginOutcome } from "./api/auth-api";

/** The provider hands the SPA its session through validated URL search parameters. */
export const googleCallbackSearchSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.string().optional(),
});

export function GoogleCallback({
  search,
  onSignedIn,
}: {
  search: Record<string, unknown>;
  onSignedIn: (outcome: LoginOutcome) => void;
}) {
  const parsed = googleCallbackSearchSchema.safeParse(search);
  // The returned tokens establish the session exactly once; signing in re-renders this
  // component and the effect must not hand the same tokens over again.
  const consumed = useRef(false);

  useEffect(() => {
    if (!parsed.success || consumed.current) return;
    consumed.current = true;
    const outcome: LoginOutcome = {
      requiresTwoFactor: false,
      accessToken: parsed.data.accessToken,
      refreshToken: parsed.data.refreshToken,
    };
    if (parsed.data.accessTokenExpiresAt) {
      outcome.accessTokenExpiresAt = parsed.data.accessTokenExpiresAt;
    }
    onSignedIn(outcome);
  }, [parsed.success, parsed.data, onSignedIn]);

  if (!parsed.success) {
    return (
      <div className="flex flex-col gap-3">
        <div role="alert" className="rounded-md border border-destructive p-3 text-sm">
          Google sign-in could not be completed. No session was returned.
        </div>
        <Link to="/login">Back to sign in</Link>
      </div>
    );
  }

  return <p role="status">Finishing Google sign-in…</p>;
}
