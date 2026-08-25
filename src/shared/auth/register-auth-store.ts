import {
  earliestDeadline,
  lockRegisterPartition,
  wrapRegisterCredential,
  type RegisterAuthorizationState,
  type WrappedRegisterCredential,
} from "./register-authorization";

let state: RegisterAuthorizationState = {
  unlocked: false,
  tenantId: "",
  registerId: "",
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

export async function unlockRegister(input: {
  tenantId: string;
  registerId: string;
  shiftId: string;
  accessToken: string;
  expiresAt: string;
  authorizedAt?: string;
}): Promise<RegisterAuthorizationState> {
  const authorizedAt = input.authorizedAt ?? new Date().toISOString();
  const credential = await wrapRegisterCredential({
    tenantId: input.tenantId,
    registerId: input.registerId,
    token: input.accessToken,
    expiresAt: input.expiresAt,
  });
  const deadline = earliestDeadline(input.expiresAt, null, authorizedAt);
  state = {
    unlocked: true,
    tenantId: input.tenantId,
    registerId: input.registerId,
    deadline,
    credential,
  };
  emit();
  return state;
}

export function lockRegisterAuth(): void {
  state = lockRegisterPartition(state);
  emit();
}

export function getWrappedRegisterCredential(): WrappedRegisterCredential | null {
  return state.credential;
}
