import { z } from "zod";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  uuidSchema,
} from "../../../shared/api/client/boundary-schema";
import { useSession } from "../../../shared/auth/session-context";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../shared/api/client/query-scope";
import { authorizedFetch } from "../../../shared/api/client/authorized-fetch";
import { parseAppProblem } from "../../../shared/api/errors/app-problem";
import { ProblemError } from "../../../shared/api/errors/problem-error";
import { normalizeBillingPlans, planSchema, type BillingPlan } from "./plan-schema";

export type { BillingPlan } from "./plan-schema";
export { planSchema } from "./plan-schema";

export const billingPlansQueryKey = ["billing", "plans"] as const;

const origin = (
  import.meta.env.VITE_INVENTORYX_ORIGIN || "http://localhost:5088"
).replace(/\/$/, "");

function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  return authorizedFetch(`${origin}${path}`, init);
}

const usageSchema = z
  .object({
    metric: z.string(),
    current: z.number().int(),
    limit: z.number().int().nullish(),
  })
  .transform(({ current, ...usage }) => ({ ...usage, used: current }));

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
  amount: apiDecimalSchema,
  taxAmount: apiDecimalSchema,
  currency: z.string(),
  createdAt: z.string(),
});

const invoicePageSchema = z.object({
  items: z.array(invoiceSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export type BillingInvoice = z.infer<typeof invoiceSchema>;

export async function fetchPlans(): Promise<BillingPlan[]> {
  const outcome = await inventoryxClient.GET("/api/v1/billing/plans");
  return normalizeBillingPlans(
    parseValue(outcome, z.array(planSchema), "Billing plans"),
  );
}

export async function fetchSubscription(): Promise<BillingSubscription> {
  const outcome = await inventoryxClient.GET("/api/v1/billing/subscription");
  return parseValue(outcome, subscriptionSchema, "Subscription");
}

export async function fetchInvoices(): Promise<BillingInvoice[]> {
  const outcome = await inventoryxClient.GET("/api/v1/billing/invoices");
  return parseValue(outcome, invoicePageSchema, "Billing invoices").items;
}

export async function upgradePlan(planId: string): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v1/billing/subscription/upgrade", {
    method: "POST",
    body: JSON.stringify({ planDefinitionId: planId }),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new ProblemError(parseAppProblem({ status: response.status, body, headers: response.headers }));
  }
  return subscriptionSchema.parse(body);
}

export async function downgradePlan(planId: string): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v1/billing/subscription/downgrade", {
    method: "POST",
    body: JSON.stringify({ planDefinitionId: planId, acknowledgeOverLimit: true }),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new ProblemError(parseAppProblem({ status: response.status, body, headers: response.headers }));
  }
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

export async function downloadDataExport(jobId: string): Promise<void> {
  const response = await authedFetch(`/api/v1/tenant/export/${encodeURIComponent(jobId)}`);
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    throw new ProblemError(parseAppProblem({ status: response.status, body, headers: response.headers }));
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventoryx-export.zip";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function useBillingPlans(): UseQueryResult<BillingPlan[]> {
  return useQuery({ queryKey: billingPlansQueryKey, queryFn: fetchPlans });
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
