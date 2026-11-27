import { z } from "zod";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { components as BillingComponents } from "../../../shared/api/generated/inventoryx-v2";
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

type QuoteRequest =
  BillingComponents["schemas"]["InventoryX.Presentation.Controllers.v2.CreateBillingQuoteRequest"];
type PurchaseRequest =
  BillingComponents["schemas"]["InventoryX.Presentation.Controllers.v2.CreateBillingPurchaseRequest"];
type ReplaceMethodRequest =
  BillingComponents["schemas"]["InventoryX.Presentation.Controllers.v2.ReplacePaymentMethodRequest"];

const quoteSchema = z.object({
  quoteId: uuidSchema,
  expiresAt: z.string(),
  currency: z.string(),
  baseAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  prorationCredit: z.number(),
  effectiveAt: z.string(),
  nextRenewalAt: z.string(),
  nextRenewalTotal: z.number(),
  exceededLimits: z.array(z.string()),
  requiresAcknowledgement: z.boolean(),
});
const paymentIntentSchema = z.object({
  intentId: uuidSchema,
  status: z.string(),
  authorizationUrl: z.string().nullish(),
  approvalMessage: z.string().nullish(),
  pollAfterSeconds: z.number().int(),
});
const paymentIntentStatusSchema = paymentIntentSchema.pick({
  intentId: true,
  status: true,
  pollAfterSeconds: true,
});
export type BillingQuote = z.infer<typeof quoteSchema>;
export type BillingPaymentIntent = z.infer<typeof paymentIntentSchema>;
export type BillingPaymentIntentStatus = z.infer<typeof paymentIntentStatusSchema>;

const billingMethodSchema = z.object({
  id: uuidSchema,
  kind: z.string(),
  status: z.string(),
  provider: z.string(),
  maskedIdentifier: z.string(),
  brand: z.string().nullish(),
  expiryMonth: z.number().int().nullish(),
  expiryYear: z.number().int().nullish(),
  renewalMode: z.string(),
});
const methodVerificationQuoteSchema = z.object({
  baseAmount: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  currency: z.string(),
});
const methodReplacementSchema = z.object({
  intentId: uuidSchema,
  pendingMethodId: uuidSchema,
  reference: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
  authorizationUrl: z.string().nullish(),
  approvalMessage: z.string().nullish(),
  pollAfterSeconds: z.number().int(),
});
export type BillingPaymentMethod = z.infer<typeof billingMethodSchema>;
export type MethodVerificationQuote = z.infer<typeof methodVerificationQuoteSchema>;
export type MethodReplacement = z.infer<typeof methodReplacementSchema>;

export async function fetchPaymentMethods(): Promise<BillingPaymentMethod[]> {
  const response = await authedFetch("/api/v2/billing/payment-methods");
  return readBillingResponse(response, z.array(billingMethodSchema), "Payment methods");
}

export async function fetchMethodVerificationQuote(): Promise<MethodVerificationQuote> {
  const response = await authedFetch("/api/v2/billing/payment-methods/quote");
  return readBillingResponse(
    response,
    methodVerificationQuoteSchema,
    "Method verification quote",
  );
}

export async function replacePaymentMethod(
  input: ReplaceMethodRequest,
  idempotencyKey: string,
): Promise<MethodReplacement> {
  const response = await authedFetch("/api/v2/billing/payment-methods", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return readBillingResponse(
    response,
    methodReplacementSchema,
    "Payment method replacement",
  );
}

export async function downloadInvoicePdf(invoiceId: string): Promise<Blob> {
  const response = await authedFetch(
    `/api/v2/billing/invoices/${encodeURIComponent(invoiceId)}/pdf`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    throw new ProblemError(
      parseAppProblem({ status: response.status, body, headers: response.headers }),
    );
  }
  if (!response.headers.get("Content-Type")?.includes("application/pdf"))
    throw new Error("The invoice response was not a PDF.");
  return response.blob();
}

async function readBillingResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  label: string,
): Promise<T> {
  const body: unknown = await response.json().catch(() => undefined);
  return parseValue({ response, data: body, error: body }, schema, label);
}

export async function createBillingQuote(
  input: QuoteRequest,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<BillingQuote> {
  const response = await authedFetch("/api/v2/billing/quotes", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": idempotencyKey },
    signal: signal ?? null,
  });
  return readBillingResponse(response, quoteSchema, "Billing quote");
}

export async function createSubscriptionQuote(input: {
  targetPlanId: string;
  billingCycle: string;
  purpose: string;
}): Promise<BillingQuote> {
  const response = await authedFetch("/api/v2/billing/quotes", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  return readBillingResponse(response, quoteSchema, "Subscription change quote");
}

export async function scheduleSubscriptionChange(input: {
  quoteId: string;
  acknowledgeExceededLimits: boolean;
}): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v2/billing/changes", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  return readBillingResponse(response, subscriptionSchema, "Subscription change");
}

export async function reverseSubscriptionChange(changeId: string): Promise<void> {
  const response = await authedFetch(
    `/api/v2/billing/changes/${encodeURIComponent(changeId)}`,
    { method: "DELETE", headers: { "Idempotency-Key": crypto.randomUUID() } },
  );
  if (!response.ok)
    throw new ProblemError(
      parseAppProblem({
        status: response.status,
        body: await response.json().catch(() => undefined),
        headers: response.headers,
      }),
    );
}

export async function startRecovery(input: {
  methodKind: string;
  provider?: string;
  phoneNumber?: string;
}): Promise<BillingPaymentIntent> {
  const response = await authedFetch("/api/v2/billing/recovery", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  return readBillingResponse(response, paymentIntentSchema, "Recovery payment");
}

export async function createPaymentIntent(
  input: PurchaseRequest,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<BillingPaymentIntent> {
  const response = await authedFetch("/api/v2/billing/payment-intents", {
    method: "POST",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": idempotencyKey },
    signal: signal ?? null,
  });
  return readBillingResponse(response, paymentIntentSchema, "Payment intent");
}

export async function fetchPaymentIntentStatus(
  intentId: string,
  signal?: AbortSignal,
): Promise<BillingPaymentIntentStatus> {
  const response = await authedFetch(
    `/api/v2/billing/payment-intents/${encodeURIComponent(intentId)}`,
    {
      signal: signal ?? null,
    },
  );
  return readBillingResponse(
    response,
    paymentIntentStatusSchema,
    "Payment intent status",
  );
}

export function usePaymentIntentStatus(
  intentId: string | null,
): UseQueryResult<BillingPaymentIntentStatus> {
  const { session } = useSession();
  return useQuery({
    queryKey: ["billing", session?.tenantId ?? "anonymous", intentId, "payment-intent"],
    queryFn: ({ signal }) => {
      if (!intentId) throw new Error("Payment intent ID is required.");
      return fetchPaymentIntentStatus(intentId, signal);
    },
    enabled: Boolean(session?.tenantId && intentId),
    refetchInterval: (query) =>
      query.state.data?.status === "succeeded" || query.state.data?.status === "failed"
        ? false
        : (query.state.data?.pollAfterSeconds ?? 5) * 1000,
  });
}

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
  canPerformPaidMutations: z.boolean().default(true),
  readOnlyReason: z.string().nullish(),
  nextRenewalAt: z.string().nullish(),
  nextRenewalAmount: z.number().nullish(),
  scheduledChangeId: uuidSchema.nullish(),
  scheduledChangeKind: z.string().nullish(),
  scheduledChangeEffectiveAt: z.string().nullish(),
  outstandingAmount: z.number().nullish(),
  lastChargeAttemptAt: z.string().nullish(),
  failedChargeAttempts: z.number().int().default(0),
  retryStatus: z.string().nullish(),
  methodSummary: billingMethodSchema.omit({ status: true }).nullish(),
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
export type BillingInvoicePage = z.infer<typeof invoicePageSchema>;

export async function fetchPlans(): Promise<BillingPlan[]> {
  const response = await authedFetch("/api/v2/billing/plans");
  return normalizeBillingPlans(
    await readBillingResponse(response, z.array(planSchema), "Billing plans"),
  );
}

export async function fetchSubscription(): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v2/billing/subscription");
  return readBillingResponse(response, subscriptionSchema, "Subscription");
}

export async function fetchInvoices(): Promise<BillingInvoice[]> {
  return (await fetchInvoicePage()).items;
}

export async function fetchInvoicePage(
  page = 1,
  pageSize = 50,
): Promise<BillingInvoicePage> {
  const response = await authedFetch(
    `/api/v2/billing/invoices?page=${String(page)}&pageSize=${String(pageSize)}`,
  );
  return readBillingResponse(response, invoicePageSchema, "Billing invoices");
}

export async function upgradePlan(planId: string): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v2/billing/subscription/upgrade", {
    method: "POST",
    body: JSON.stringify({ planDefinitionId: planId }),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new ProblemError(
      parseAppProblem({ status: response.status, body, headers: response.headers }),
    );
  }
  return subscriptionSchema.parse(body);
}

export async function downgradePlan(planId: string): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v2/billing/subscription/downgrade", {
    method: "POST",
    body: JSON.stringify({ planDefinitionId: planId, acknowledgeOverLimit: true }),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    throw new ProblemError(
      parseAppProblem({ status: response.status, body, headers: response.headers }),
    );
  }
  return subscriptionSchema.parse(body);
}

export async function cancelSubscription(): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v2/billing/cancellation", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const body: unknown = await response.json();
  return subscriptionSchema.parse(body);
}

export async function reactivateSubscription(): Promise<BillingSubscription> {
  const response = await authedFetch("/api/v2/billing/subscription/reactivate", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const body: unknown = await response.json();
  return subscriptionSchema.parse(body);
}

export async function updateBillingContact(input: {
  billingEmail: string;
  taxNumber?: string;
}): Promise<void> {
  const response = await authedFetch("/api/v2/billing/contact", {
    method: "PATCH",
    body: JSON.stringify(input),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    throw new ProblemError(
      parseAppProblem({ status: response.status, body, headers: response.headers }),
    );
  }
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
  const response = await authedFetch(
    `/api/v1/tenant/export/${encodeURIComponent(jobId)}`,
  );
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    throw new ProblemError(
      parseAppProblem({ status: response.status, body, headers: response.headers }),
    );
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventoryx-export.zip";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
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
