import { z } from "zod";
import { authorizedFetch } from "../../../shared/api/client/authorized-fetch";
import { clampPageSize, uuidSchema } from "../../../shared/api/client/boundary-schema";

const origin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  return authorizedFetch(`${origin}${path}`, init);
}

export const staffUserSchema = z.object({
  id: z.string(),
  email: z.string().nullish(),
  name: z.string().nullish(),
  roleId: uuidSchema.nullish(),
  locationScope: z.string().nullish(),
  status: z.string(),
  isOwner: z.boolean().optional(),
});

export type StaffUser = z.infer<typeof staffUserSchema>;

export async function fetchStaffUsers(): Promise<StaffUser[]> {
  const response = await authedFetch("/api/v1/users");
  if (!response.ok) throw new Error("Failed to load staff");
  const body: unknown = await response.json();
  if (Array.isArray(body)) return z.array(staffUserSchema).parse(body);
  return z.object({ items: z.array(staffUserSchema) }).parse(body).items;
}

export async function fetchRoles() {
  const response = await authedFetch("/api/v1/roles");
  if (!response.ok) throw new Error("Failed to load roles");
  return z
    .array(
      z.object({
        id: uuidSchema,
        name: z.string(),
        permissions: z.string().nullish(),
        maxDiscountPercent: z.number().nullish(),
        maxUnauthorizedRefundAmount: z.number().nullish(),
      }),
    )
    .parse(await response.json());
}

export async function inviteStaff(input: {
  email: string;
  roleId?: string;
  locationScope?: string;
}): Promise<{ id: string; token?: string }> {
  const response = await authedFetch("/api/v1/users/invitations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (response.status === 422 || response.status === 400) {
    throw new Error("Invitation rejected (limit or validation)");
  }
  if (!response.ok) throw new Error("Failed to invite staff");
  const parsed = z
    .object({ id: z.string(), token: z.string().optional() })
    .parse(await response.json());
  return parsed.token ? { id: parsed.id, token: parsed.token } : { id: parsed.id };
}

export async function acceptInvitation(input: {
  userId: string;
  token: string;
  password: string;
}): Promise<void> {
  const response = await fetch(
    `${origin}/api/v1/users/invitations/${input.userId}/accept`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token: input.token, password: input.password }),
    },
  );
  if (!response.ok) throw new Error("Failed to accept invitation");
}

export async function updateStaffUser(
  id: string,
  input: { roleId?: string; locationScope?: string; status?: string },
): Promise<void> {
  const response = await authedFetch(`/api/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (response.status === 409)
    throw new Error("Cannot change sole owner or open-shift user");
  if (!response.ok) throw new Error("Failed to update staff user");
}

export async function setRegisterPin(userId: string, pin: string): Promise<void> {
  const response = await authedFetch(`/api/v1/users/${userId}/pin`, {
    method: "PUT",
    body: JSON.stringify({ pin }),
  });
  if (!response.ok) throw new Error("Failed to set register PIN");
}

export async function enrollTwoFactor(): Promise<{
  sharedKey: string;
  authenticatorUri: string;
}> {
  const response = await authedFetch("/api/v1/auth/2fa/enroll", { method: "POST" });
  if (!response.ok) throw new Error("Failed to enroll 2FA");
  return z
    .object({
      sharedKey: z.string(),
      authenticatorUri: z.string(),
    })
    .parse(await response.json());
}

export async function fetchAuditLog(page = 1, pageSize = 50) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(clampPageSize(pageSize)),
  });
  const response = await authedFetch(`/api/v1/audit-log?${params}`);
  if (!response.ok) throw new Error("Failed to load audit log");
  const body: unknown = await response.json();
  return z
    .object({
      items: z.array(
        z.object({
          id: z.string().optional(),
          actor: z.string().nullish(),
          action: z.string(),
          target: z.string().nullish(),
          reason: z.string().nullish(),
          occurredAt: z.string(),
          metadata: z.record(z.string(), z.unknown()).nullish(),
        }),
      ),
      page: z.number().int(),
      pageSize: z.number().int(),
      totalCount: z.number().int(),
    })
    .parse(body);
}

/** Clear tenant/location-scoped caches after staff scope changes. */
export function staffScopeQueryPrefixes(): string[] {
  return ["staff", "locations", "reports", "notifications", "purchasing", "inventory"];
}
