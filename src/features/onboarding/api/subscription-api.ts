import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../shared/api/client/api-result";
import { uuidSchema } from "../../../shared/api/client/boundary-schema";
import { useSession } from "../../../shared/auth/session-context";
import {
  permissionRevisionFor,
  scopedQueryKey,
} from "../../../shared/api/client/query-scope";

const usageSchema = z.object({
  metric: z.string(),
  used: z.number().int(),
  limit: z.number().int().nullish(),
});

export type UsageVsLimit = z.infer<typeof usageSchema>;

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
});

export type SubscriptionSummary = z.infer<typeof subscriptionSchema>;

export async function fetchSubscription(): Promise<SubscriptionSummary> {
  const outcome = await inventoryxClient.GET("/api/v1/billing/subscription");
  return parseValue(outcome, subscriptionSchema, "Subscription");
}

export function useSubscription(): UseQueryResult<SubscriptionSummary> {
  const { session } = useSession();
  return useQuery({
    queryKey: scopedQueryKey({
      tenantId: session?.tenantId ?? "anonymous",
      permissionRevision: permissionRevisionFor(session),
      resource: "subscription",
    }),
    queryFn: fetchSubscription,
  });
}
