import { z } from "zod";
import type { SessionRecord } from "./session-manager";

/** ASP.NET Core default claim type for roles when written into a JWT. */
const MS_ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const MS_NAME_ID_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

const claimsSchema = z.object({
  sub: z.string().min(1),
  tenantId: z.string().min(1),
  role: z.string().min(1),
  permissions: z.union([z.array(z.string()), z.string()]).default([]),
  locationScope: z.union([z.array(z.string()), z.string()]).default([]),
  exp: z.number().int().optional(),
});

/** Mirrors InventoryX `RoleSeeder` when the JWT omits a `permissions` claim.
 *
 * APPROVED EXCEPTION (FR-079 / T241): InventoryX access tokens currently omit an
 * explicit `permissions` claim and only emit role / tenant / location scope. Until the
 * provider ships permission atoms in the JWT (or a `/me` permissions resource), the
 * client mirrors the provider RoleSeeder map so Owner/Admin/Cashier navigation remains
 * usable against the live API. Claimed `permissions` always win when present. Documented
 * in `specs/001-inventory-pos-frontend/validation/security-audit.md`.
 */
const ALL_PERMISSIONS = [
  "Sell",
  "Refund",
  "Discount",
  "VoidSale",
  "ViewProfit",
  "ManageStock",
  "ManagePurchasing",
  "ManagePricing",
  "ManageUsers",
  "ViewReports",
  "ApproveAdjustments",
] as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  Owner: ALL_PERMISSIONS,
  Administrator: ALL_PERMISSIONS,
  Manager: [
    "Sell",
    "Refund",
    "Discount",
    "VoidSale",
    "ViewProfit",
    "ManageStock",
    "ManagePurchasing",
    "ViewReports",
    "ApproveAdjustments",
  ],
  Cashier: ["Sell", "Refund", "Discount"],
  StockClerk: ["ManageStock"],
  Accountant: ["ViewReports", "ViewProfit"],
  ReadOnly: ["ViewReports"],
};

function toList(value: string[] | string): string[] {
  if (Array.isArray(value)) return value;
  // InventoryX may emit space- or comma-separated lists, or a single "*" scope.
  return value.split(/[,\s]+/).filter(Boolean);
}

export function permissionsForRole(role: string): string[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

function decodeSegment(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return JSON.parse(json);
}

/**
 * InventoryX JWTs use snake_case / Microsoft claim URIs (`tenant_id`,
 * `location_scope`, ClaimTypes.Role). MSW fixtures use camelCase (`tenantId`,
 * `role`, `permissions`). Normalize both before schema validation.
 */
function normalizeProviderClaims(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const roleFromMs = raw[MS_ROLE_CLAIM];
  const role =
    (typeof raw.role === "string" && raw.role) ||
    (typeof roleFromMs === "string" && roleFromMs) ||
    (raw.is_owner === true || raw.is_owner === "true" ? "Owner" : undefined);

  const subFromMs = raw[MS_NAME_ID_CLAIM];
  const sub =
    (typeof raw.sub === "string" && raw.sub) ||
    (typeof subFromMs === "string" && subFromMs) ||
    undefined;

  return {
    sub,
    tenantId: raw.tenantId ?? raw.tenant_id,
    role,
    permissions: raw.permissions ?? [],
    locationScope: raw.locationScope ?? raw.location_scope ?? [],
    exp: raw.exp,
  };
}

/** The token pair any credential exchange returns, however it was obtained. */
export interface SessionTokenInput {
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: string | null;
}

/**
 * The access token is the only description of who is signed in; InventoryX owns every
 * claim in it, so the client reads them rather than inventing a profile of its own.
 */
export function sessionFromTokens(outcome: SessionTokenInput): SessionRecord | null {
  const { accessToken } = outcome;
  if (!accessToken) return null;
  // Refresh may live only in the httpOnly cookie after a silent restore; an empty string
  // marks that case so `SessionManager.refresh` can POST without a body.

  const payload = accessToken.split(".")[1];
  if (!payload) return null;

  let claims: unknown;
  try {
    claims = decodeSegment(payload);
  } catch {
    return null;
  }

  if (!claims || typeof claims !== "object") return null;

  const parsed = claimsSchema.safeParse(
    normalizeProviderClaims(claims as Record<string, unknown>),
  );
  if (!parsed.success) return null;

  const expiresAt =
    outcome.accessTokenExpiresAt ??
    (parsed.data.exp ? new Date(parsed.data.exp * 1000).toISOString() : "");

  const claimedPermissions = toList(parsed.data.permissions);
  const permissions =
    claimedPermissions.length > 0
      ? claimedPermissions
      : permissionsForRole(parsed.data.role);

  return {
    userId: parsed.data.sub,
    tenantId: parsed.data.tenantId,
    role: parsed.data.role,
    permissions,
    locationScope: toList(parsed.data.locationScope),
    expiresAt,
    accessToken,
    refreshToken: outcome.refreshToken ?? "",
  };
}
