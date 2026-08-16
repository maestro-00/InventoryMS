import { z } from "zod";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import {
  expectSuccess,
  parseResource,
  parseValue,
} from "../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  uuidSchema,
} from "../../../shared/api/client/boundary-schema";
import { ifMatchHeaders } from "../../../shared/api/client/inventoryx-client";

export const VALUATION_METHODS = ["WeightedAverage", "FIFO"] as const;
export type ValuationMethod = (typeof VALUATION_METHODS)[number];

const checklistSchema = z.record(z.string(), z.boolean());

export type OnboardingChecklist = z.infer<typeof checklistSchema>;

const tenantProfileSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  country: z.string(),
  currency: z.string(),
  businessType: z.string(),
  valuationMethod: z.string(),
  onboardingChecklist: z
    .string()
    .transform((raw) => {
      try {
        return checklistSchema.parse(JSON.parse(raw));
      } catch {
        return {};
      }
    })
    .catch({}),
  sampleDataLoaded: z.boolean(),
  adjustmentApprovalThreshold: apiDecimalSchema.nullish(),
  poApprovalThreshold: apiDecimalSchema.nullish(),
  tillVarianceThreshold: apiDecimalSchema.nullish(),
  returnAuthorizationThreshold: apiDecimalSchema.nullish(),
  requireExpiryOnBatchReceipt: z.boolean(),
  billingEmail: z.string().nullish(),
  address: z.string().nullish(),
  phone: z.string().nullish(),
});

export type TenantProfile = z.infer<typeof tenantProfileSchema>;

export interface TenantUpdate {
  name?: string;
  address?: string;
  phone?: string;
  billingEmail?: string;
  valuationMethod?: string;
  confirmValuationChange?: boolean;
  adjustmentApprovalThreshold?: string;
  poApprovalThreshold?: string;
  tillVarianceThreshold?: string;
  returnAuthorizationThreshold?: string;
  requireExpiryOnBatchReceipt?: boolean;
  onboardingChecklist?: OnboardingChecklist;
}

export async function fetchTenant(): Promise<{
  tenant: TenantProfile;
  etag: string | undefined;
}> {
  const outcome = await inventoryxClient.GET("/api/v1/tenant");
  const { value, etag } = parseResource(
    outcome,
    tenantProfileSchema,
    "Business profile",
  );
  return { tenant: value, etag };
}

export async function updateTenant(
  update: TenantUpdate,
  etag?: string,
): Promise<TenantProfile> {
  const { onboardingChecklist, ...rest } = update;
  const body: Record<string, unknown> = { ...rest };
  if (onboardingChecklist) {
    body["onboardingChecklist"] = JSON.stringify(onboardingChecklist);
  }
  const outcome = await inventoryxClient.PATCH("/api/v1/tenant", {
    body,
    headers: ifMatchHeaders(etag),
  });
  return parseValue(outcome, tenantProfileSchema, "Business profile");
}

export async function loadSampleData(): Promise<void> {
  expectSuccess(await inventoryxClient.POST("/api/v1/tenant/sample-data", {}));
}

export async function removeSampleData(): Promise<void> {
  expectSuccess(await inventoryxClient.DELETE("/api/v1/tenant/sample-data", {}));
}
