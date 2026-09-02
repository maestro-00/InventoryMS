import { z } from "zod";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { expectSuccess, parseValue } from "../../../shared/api/client/api-result";
import {
  utcInstantSchema,
  uuidSchema,
} from "../../../shared/api/client/boundary-schema";
import { isProblemError } from "../../../shared/api/errors/problem-error";
import type { SessionRecord } from "../../../shared/auth/session-manager";
import { internalRedirectTarget } from "../../../shared/auth/redirect-target";

const origin = import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088";

export const registerTenantInputSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(12, "Use at least 12 characters"),
  businessName: z.string().min(2, "Enter the business name"),
  country: z.string().length(2, "Select a country"),
  currency: z.string().length(3, "Select a currency"),
  businessType: z.string().min(2, "Select a business type"),
});

export type RegisterTenantInput = z.infer<typeof registerTenantInputSchema>;

const tenantRegistrationSchema = z.object({
  tenantId: uuidSchema,
  businessName: z.string(),
  subscriptionStatus: z.string(),
  accessToken: z.string().min(1),
  accessTokenExpiresAt: utcInstantSchema,
  refreshToken: z.string().min(1),
});

export type TenantRegistration = z.infer<typeof tenantRegistrationSchema>;

export const loginInputSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  twoFactorCode: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

const loginResultSchema = z.object({
  requiresTwoFactor: z.boolean().default(false),
  accessToken: z.string().nullish(),
  accessTokenExpiresAt: z.string().nullish(),
  refreshToken: z.string().nullish(),
});

export interface LoginOutcome {
  requiresTwoFactor: boolean;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
}

export async function registerTenant(
  input: RegisterTenantInput,
): Promise<TenantRegistration> {
  const outcome = await inventoryxClient.POST("/api/v1/auth/register", {
    body: registerTenantInputSchema.parse(input),
  });
  return parseValue(outcome, tenantRegistrationSchema, "Business registration");
}

/**
 * A provider 423 with the `two_factor_required` problem type is a challenge, not a
 * failure; every other problem is rethrown for the normalized error surface.
 */
export async function login(input: LoginInput): Promise<LoginOutcome> {
  const parsed = loginInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/auth/login", {
    body: {
      email: parsed.email,
      password: parsed.password,
      twoFactorCode: parsed.twoFactorCode ?? null,
    },
  });

  if (outcome.response.status === 423) {
    return { requiresTwoFactor: true };
  }

  const result = parseValue(outcome, loginResultSchema, "Sign in");
  const login: LoginOutcome = { requiresTwoFactor: result.requiresTwoFactor };
  if (result.accessToken) login.accessToken = result.accessToken;
  if (result.refreshToken) login.refreshToken = result.refreshToken;
  if (result.accessTokenExpiresAt) {
    login.accessTokenExpiresAt = result.accessTokenExpiresAt;
  }
  return login;
}

export async function verifyTwoFactor(code: string): Promise<void> {
  const outcome = await inventoryxClient.POST("/api/v1/auth/2fa/verify", {
    body: { code },
  });
  expectSuccess(outcome);
}

const pinExchangeResultSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string().nullish(),
});

function expiresAtFromAccessToken(accessToken: string): string {
  const payload = accessToken.split(".")[1];
  if (!payload) return new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    const claims = JSON.parse(json) as { exp?: number };
    if (typeof claims.exp === "number") {
      return new Date(claims.exp * 1000).toISOString();
    }
  } catch {
    /* fall through */
  }
  return new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
}

export async function exchangeRegisterPin(input: {
  userId: string;
  pin: string;
  registerId: string;
}): Promise<{ accessToken: string; expiresAt: string }> {
  const outcome = await inventoryxClient.POST("/api/v1/auth/pin/exchange", {
    body: {
      userId: input.userId,
      pin: input.pin,
      registerId: input.registerId,
    },
  });
  const result = parseValue(outcome, pinExchangeResultSchema, "Register PIN exchange");
  return {
    accessToken: result.accessToken,
    expiresAt: expiresAtFromAccessToken(result.accessToken),
  };
}

/** InventoryX drives the Google challenge; the browser leaves the SPA to start it. */
export function googleSignInUrl(returnUrl: string): string {
  const url = new URL("/api/v1/auth/google", origin);
  url.searchParams.set("returnUrl", returnUrl);
  return url.toString();
}

/** Provider redirects here with tokens; optional redirect preserves the post-login destination. */
export function googleOAuthReturnPath(postLoginTarget?: string | null): string {
  const safe = internalRedirectTarget(postLoginTarget ?? undefined);
  if (!safe) return "/auth/google-callback";
  return `/auth/google-callback?redirect=${encodeURIComponent(safe)}`;
}

/**
 * Absolute SPA URL for InventoryX OAuth `returnUrl`. Relative paths redirect to the API
 * host after Google sign-in; the callback route lives on the frontend origin only.
 */
export function googleOAuthReturnUrl(
  postLoginTarget?: string | null,
  frontendOrigin?: string,
): string {
  const path = googleOAuthReturnPath(postLoginTarget);
  const base =
    frontendOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return path;
  const absolute = `${base.replace(/\/$/, "")}${path}`;
  return absolute;
}

export function isTwoFactorChallenge(error: unknown): boolean {
  return isProblemError(error) && error.problem.status === 423;
}

/**
 * Builds the memory-only session record the session manager stores after a successful
 * credential exchange. Claims that the provider owns stay server-authoritative.
 */
export function toSessionRecord(input: {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
  locationScope: string[];
  expiresAt: string;
  accessToken: string;
  refreshToken: string;
}): SessionRecord {
  return { ...input };
}
