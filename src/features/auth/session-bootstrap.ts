import { sessionFromTokens as sessionFromClaims } from "../../shared/auth/session-claims";
import type { SessionRecord } from "../../shared/auth/session-manager";
import type { LoginOutcome } from "./api/auth-api";

/**
 * Claim decoding lives in `shared/auth` so the session manager can rebuild a session
 * during cookie restore without depending on this feature.
 */
export function sessionFromTokens(outcome: LoginOutcome): SessionRecord | null {
  return sessionFromClaims(outcome);
}

export { permissionsForRole } from "../../shared/auth/session-claims";
