const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export interface WrappedRegisterCredential {
  tenantId: string;
  registerId: string;
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  wrappedKey: ArrayBuffer;
  expiresAt: string;
}

export interface RegisterAuthorizationState {
  unlocked: boolean;
  tenantId: string;
  registerId: string;
  shiftId: string;
  deadline: string | null;
  credential: WrappedRegisterCredential | null;
}

/** Session-scoped wrapping keys kept in memory only (never persisted). */
const wrappingKeys = new Map<string, CryptoKey>();

function credentialKey(tenantId: string, registerId: string): string {
  return `${tenantId}:${registerId}`;
}

function requireSubtle(): SubtleCrypto {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  const subtle = cryptoApi?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto is required for register authorization.");
  }
  return subtle;
}

export function earliestDeadline(
  credentialExpiresAt: string,
  shiftClosesAt: string | null,
  authorizedAt: string,
): string {
  const candidates = [
    Date.parse(credentialExpiresAt),
    Date.parse(authorizedAt) + TWELVE_HOURS_MS,
  ];
  if (shiftClosesAt) candidates.push(Date.parse(shiftClosesAt));
  return new Date(Math.min(...candidates)).toISOString();
}

export async function wrapRegisterCredential(input: {
  tenantId: string;
  registerId: string;
  token: string;
  expiresAt: string;
}): Promise<WrappedRegisterCredential> {
  const subtle = requireSubtle();
  const deviceKey = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    deviceKey,
    new TextEncoder().encode(input.token),
  );
  // Non-extractable key cannot be persisted as JWK; keep a session-scoped exportable
  // wrapper in memory for the open shift only.
  const exportable = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "wrapKey",
    "unwrapKey",
  ]);
  const wrappedKey = await subtle.wrapKey("raw", deviceKey, exportable, {
    name: "AES-GCM",
    iv,
  });
  wrappingKeys.set(credentialKey(input.tenantId, input.registerId), exportable);
  return {
    tenantId: input.tenantId,
    registerId: input.registerId,
    ciphertext,
    iv,
    wrappedKey,
    expiresAt: input.expiresAt,
  };
}

export async function unwrapRegisterCredential(
  credential: WrappedRegisterCredential,
): Promise<string> {
  const subtle = requireSubtle();
  const wrappingKey = wrappingKeys.get(
    credentialKey(credential.tenantId, credential.registerId),
  );
  if (!wrappingKey) {
    throw new Error("Register credential wrapping key is unavailable.");
  }
  const deviceKey = await subtle.unwrapKey(
    "raw",
    credential.wrappedKey,
    wrappingKey,
    { name: "AES-GCM", iv: credential.iv as BufferSource },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv: credential.iv as BufferSource },
    deviceKey,
    credential.ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

export function forgetWrappingKey(tenantId: string, registerId: string): void {
  wrappingKeys.delete(credentialKey(tenantId, registerId));
}

export function clearAllWrappingKeys(): void {
  wrappingKeys.clear();
}

export function lockRegisterPartition(
  state: RegisterAuthorizationState,
): RegisterAuthorizationState {
  if (state.tenantId && state.registerId) {
    forgetWrappingKey(state.tenantId, state.registerId);
  }
  return {
    ...state,
    unlocked: false,
    credential: null,
    shiftId: "",
    deadline: state.deadline,
  };
}

export function canUnlockPartition(
  state: RegisterAuthorizationState,
  tenantId: string,
  registerId: string,
): boolean {
  return state.tenantId === tenantId && state.registerId === registerId;
}

export function isPastDeadline(
  deadline: string | null,
  now: Date = new Date(),
): boolean {
  if (!deadline) return true;
  return now.getTime() >= Date.parse(deadline);
}
