import {
  earliestDeadline,
  lockRegisterPartition,
  unwrapRegisterCredential,
  wrapRegisterCredential,
  type RegisterAuthorizationState,
  type WrappedRegisterCredential,
} from "./register-authorization";
import {
  lockRegisterPartitionMeta,
  rememberRegisterPartition,
} from "../db/register-partition-lock";
import { sessionManager } from "./session-manager";

let state: RegisterAuthorizationState = {
  unlocked: false,
  tenantId: "",
  registerId: "",
  shiftId: "",
  deadline: null,
  credential: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getRegisterAuthState(): RegisterAuthorizationState {
  return state;
}

export function subscribeRegisterAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isRegisterUnlocked(tenantId: string, registerId: string): boolean {
  return (
    state.unlocked &&
    state.tenantId === tenantId &&
    state.registerId === registerId &&
    state.credential !== null &&
    (state.deadline ? Date.parse(state.deadline) > Date.now() : false)
  );
}

export function isRegisterUnlockedForShift(
  tenantId: string,
  registerId: string,
  shiftId: string,
): boolean {
  return isRegisterUnlocked(tenantId, registerId) && state.shiftId === shiftId;
}

export async function unlockRegister(input: {
  tenantId: string;
  registerId: string;
  shiftId: string;
  accessToken: string;
  expiresAt: string;
  authorizedAt?: string;
  shiftClosesAt?: string | null;
}): Promise<RegisterAuthorizationState> {
  const authorizedAt = input.authorizedAt ?? new Date().toISOString();
  const credential = await wrapRegisterCredential({
    tenantId: input.tenantId,
    registerId: input.registerId,
    token: input.accessToken,
    expiresAt: input.expiresAt,
  });
  const deadline = earliestDeadline(
    input.expiresAt,
    input.shiftClosesAt ?? null,
    authorizedAt,
  );
  state = {
    unlocked: true,
    tenantId: input.tenantId,
    registerId: input.registerId,
    shiftId: input.shiftId,
    deadline,
    credential,
  };
  rememberRegisterPartition(input.tenantId, input.registerId);
  emit();
  return state;
}

/** Clears in-memory unlock and optionally persists IndexedDB partition lock. */
export async function lockRegisterAuth(options?: {
  persistPartition?: boolean;
}): Promise<void> {
  const previous = state;
  state = lockRegisterPartition(state);
  emit();
  if (options?.persistPartition !== false && previous.tenantId && previous.registerId) {
    await lockRegisterPartitionMeta(previous.tenantId, previous.registerId);
  }
}

export function getWrappedRegisterCredential(): WrappedRegisterCredential | null {
  return state.credential;
}

/**
 * Unwraps the active register token when unlocked, shift-bound, and within deadline.
 * Optional `registerId` / `shiftId` fail closed when the caller knows the expected till.
 */
export async function getRegisterAccessToken(options?: {
  registerId?: string;
  shiftId?: string;
}): Promise<string | null> {
  if (!state.unlocked || !state.credential || !state.shiftId) return null;
  if (state.deadline && Date.parse(state.deadline) <= Date.now()) return null;
  if (options?.registerId && state.registerId !== options.registerId) return null;
  if (options?.shiftId && state.shiftId !== options.shiftId) return null;
  const snapshot = sessionManager.getSnapshot();
  // Fail closed on cross-tenant leakage when a user session is active on the shared manager.
  if (snapshot && snapshot.tenantId !== state.tenantId) return null;
  try {
    return await unwrapRegisterCredential(state.credential);
  } catch {
    return null;
  }
}
