import { z } from "zod";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../shared/api/client/api-result";
import { uuidSchema } from "../../../shared/api/client/boundary-schema";
import { useSession } from "../../../shared/auth/session-context";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../shared/api/client/query-scope";
import { authorizedFetch } from "../../../shared/api/client/authorized-fetch";

const origin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  return authorizedFetch(`${origin}${path}`, init);
}

const planSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.string(),
  monthlyPrice: z.union([z.string(), z.number()]).optional(),
  annualPrice: z.union([z.string(), z.number()]).optional(),
  limits: z.record(z.string(), z.number().nullable()).optional(),
});

export type BillingPlan = z.infer<typeof planSchema>;

const usageSchema = z.object({
  metric: z.string(),
  used: z.number().int(),
  limit: z.number().int().nullish(),
});

const subscriptionSchema = z.object({
  id: uuidSchema,
  plan: z.string(),
  status: z.string(),
  billingCycle: z.string(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  trialEndsAt: z.string().nullish(),
  graceExpiresAt: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  purgeAt: z.string().nullish(),
  usage: z.array(usageSchema).default([]),
  readOnly: z.boolean().optional(),
});

export type BillingSubscription = z.infer<typeof subscriptionSchema>;

const invoiceSchema = z.object({
  id: uuidSchema,
  number: z.string(),
  status: z.string(),
  total: z.union([z.string(), z.number()]),
  issuedAt: z.string(),
});

export type BillingInvoice = z.infer<typeof invoiceSchema>;

export async function fetchPlans(): Promise<BillingPlan[]> {
  const outcome = await inventoryxClient.GET("/api/v1/billing/plans");
  return parseValue(outcome, z.array(planSchema), "Billing plans");
}

export async function fetchSubscription(): Promise<BillingSubscription> {
  const outcome = await inventoryxClient.GET("/api/v1/billing/subscription");
  return parseValue(outcome, subscriptionSchema, "Subscription");
}

export async function fetchInvoices(): Promise<BillingInvoice[]> {
  const response = await authedFetch("/api/v1/billing/invoices");
  const body: unknown = await response.json();
  return invoiceSchema.array().parse(body);
}

export async function upgradePlan(planId: string): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v1/billing/subscription/upgrade", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
  const body: unknown = await response.json();
  return subscriptionSchema.parse(body);
}

export async function downgradePlan(planId: string): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v1/billing/subscription/downgrade", {
    method: "POST",
    body: JSON.stringify({ planId, acknowledgePeriodEnd: true }),
  });
  const body: unknown = await response.json();
  return subscriptionSchema.parse(body);
}

export async function cancelSubscription(): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v1/billing/subscription/cancel", {
    method: "POST",
  });
  const body: unknown = await response.json();
  return subscriptionSchema.parse(body);
}

export async function reactivateSubscription(): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v1/billing/subscription/reactivate", {
    method: "POST",
  });
  const body: unknown = await response.json();
  return subscriptionSchema.parse(body);
}

export async function savePaymentMethod(input: {
  channel: "Card" | "MobileMoney";
  reference: string;
}): Promise<void> {
  const response = await authedFetch("/api/v1/billing/payment-method", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Payment method update failed");
}

export async function updateBillingContact(input: {
  billingEmail: string;
  taxNumber?: string;
}): Promise<void> {
  const response = await authedFetch("/api/v1/billing/contact", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Billing contact update failed");
}

export async function startDataExport(): Promise<{ jobId: string }> {
  const outcome = await inventoryxClient.POST("/api/v1/tenant/export");
  return parseValue(
    outcome,
    z
      .object({ jobId: uuidSchema })
      .or(z.object({ id: uuidSchema }).transform((row) => ({ jobId: row.id }))),
    "Export",
  );
}

export async function fetchExportJob(jobId: string): Promise<{
  status: string;
  downloadUrl?: string | null;
}> {
  const outcome = await inventoryxClient.GET("/api/v1/tenant/export/{jobId}", {
    params: { path: { jobId } },
  });
  const parsed = parseValue(
    outcome,
    z.object({
      status: z.string(),
      downloadUrl: z.string().nullish(),
    }),
    "Export job",
  );
  return {
    status: parsed.status,
    ...(parsed.downloadUrl === undefined ? {} : { downloadUrl: parsed.downloadUrl }),
  };
}

export function useBillingPlans(): UseQueryResult<BillingPlan[]> {
  return useQuery({ queryKey: ["billing", "plans"], queryFn: fetchPlans });
}

export function useBillingSubscription(): UseQueryResult<BillingSubscription> {
  const { session } = useSession();
  return useQuery({
    queryKey: scopedQueryKey({
      tenantId: session?.tenantId ?? "anonymous",
      permissionRevision: permissionRevisionFor(session),
      resource: "billing-subscription",
    }),
    queryFn: fetchSubscription,
    enabled: Boolean(session?.tenantId),
  });
}
