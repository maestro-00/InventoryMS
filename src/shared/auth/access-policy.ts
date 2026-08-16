import { z } from "zod";

export const permissionSchema = z.enum([
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
]);

export type Permission = z.infer<typeof permissionSchema>;

export const sessionSnapshotSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
  locationScope: z.array(z.string()),
  expiresAt: z.string(),
  registerId: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

export type SessionSnapshot = z.infer<typeof sessionSnapshotSchema>;

export type AccessReason =
  | "allowed"
  | "unauthenticated"
  | "readOnly"
  | "forbidden"
  | "location"
  | "register"
  | "planLimit"
  | "offline";

export interface AccessInput {
  session: SessionSnapshot | null;
  subscriptionStatus?: string;
  locationId?: string;
  registerId?: string;
  isOnline: boolean;
  requiredPermissions?: string[];
  requireRegister?: boolean;
  requireOnline?: boolean;
  mutation?: boolean;
  requiredPlanFeature?: string;
  planFeatures?: string[];
}

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  destination?: string;
}

const READ_ONLY_ALLOWED = new Set(["ViewReports", "ViewProfit"]);

export function evaluateAccess(input: AccessInput): AccessResult {
  if (!input.session) {
    return { allowed: false, reason: "unauthenticated", destination: "/login" };
  }

  if (input.subscriptionStatus === "ReadOnly" && input.mutation === true) {
    return { allowed: false, reason: "readOnly" };
  }

  if (
    input.subscriptionStatus === "ReadOnly" &&
    (input.requiredPermissions ?? []).some(
      (permission) => !READ_ONLY_ALLOWED.has(permission) && permission !== "Sell",
    ) &&
    input.mutation !== false &&
    (input.requiredPermissions ?? []).includes("ManageStock")
  ) {
    return { allowed: false, reason: "readOnly" };
  }

  const missing = (input.requiredPermissions ?? []).filter(
    (permission) => !input.session?.permissions.includes(permission),
  );
  if (missing.length > 0) {
    return { allowed: false, reason: "forbidden" };
  }

  if (input.locationId && !input.session.locationScope.includes(input.locationId)) {
    return { allowed: false, reason: "location" };
  }

  if (input.requireRegister === true && !input.registerId) {
    return { allowed: false, reason: "register" };
  }

  if (
    input.requiredPlanFeature &&
    !(input.planFeatures ?? []).includes(input.requiredPlanFeature)
  ) {
    return { allowed: false, reason: "planLimit" };
  }

  if (input.requireOnline === true && !input.isOnline) {
    return { allowed: false, reason: "offline" };
  }

  return { allowed: true, reason: "allowed" };
}

export function hasPermission(
  session: SessionSnapshot | null,
  permission: string,
): boolean {
  return session?.permissions.includes(permission) === true;
}
