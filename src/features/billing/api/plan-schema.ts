import { z } from "zod";

const optionalMoney = z.union([z.string(), z.number()]).optional();
const optionalLimit = z.number().int().nullable().optional();

/** OpenAPI `BillingPlanDto` at the trust boundary. */
export const planSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  tier: z.string().nullish(),
  monthlyPrice: optionalMoney,
  annualPrice: optionalMoney,
  currency: z.string().optional(),
  annualSavings: optionalMoney,
  contactSales: z.boolean().optional(),
  maxLocations: optionalLimit,
  maxUsers: optionalLimit,
  maxProducts: optionalLimit,
  maxRegisters: optionalLimit,
  monthlySaleCap: optionalLimit,
  features: z.record(z.string(), z.boolean()).nullable().optional(),
});

export type BillingPlanDto = z.infer<typeof planSchema>;

export type BillingPlan = {
  id: string;
  name: string;
  tier: string;
  monthlyPrice?: number;
  annualPrice?: number;
  currency?: string;
  annualSavings?: number;
  contactSales?: boolean;
  maxLocations?: number | null;
  maxUsers?: number | null;
  maxProducts?: number | null;
  maxRegisters?: number | null;
  monthlySaleCap?: number | null;
  features?: Record<string, boolean> | null;
};

function toMoney(value: string | number | undefined): number | undefined {
  if (value == null) return undefined;
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isNaN(amount) ? undefined : amount;
}

export function normalizeBillingPlan(dto: BillingPlanDto): BillingPlan {
  const monthlyPrice = toMoney(dto.monthlyPrice);
  const annualPrice = toMoney(dto.annualPrice);
  const annualSavings = toMoney(dto.annualSavings);
  return {
    id: dto.id,
    name: dto.name ?? "",
    tier: dto.tier ?? "",
    ...(monthlyPrice === undefined ? {} : { monthlyPrice }),
    ...(annualPrice === undefined ? {} : { annualPrice }),
    ...(annualSavings === undefined ? {} : { annualSavings }),
    ...(dto.currency === undefined ? {} : { currency: dto.currency }),
    ...(dto.contactSales === undefined ? {} : { contactSales: dto.contactSales }),
    ...(dto.maxLocations === undefined ? {} : { maxLocations: dto.maxLocations }),
    ...(dto.maxUsers === undefined ? {} : { maxUsers: dto.maxUsers }),
    ...(dto.maxProducts === undefined ? {} : { maxProducts: dto.maxProducts }),
    ...(dto.maxRegisters === undefined ? {} : { maxRegisters: dto.maxRegisters }),
    ...(dto.monthlySaleCap === undefined ? {} : { monthlySaleCap: dto.monthlySaleCap }),
    ...(dto.features === undefined ? {} : { features: dto.features }),
  };
}

export function normalizeBillingPlans(dtos: BillingPlanDto[]): BillingPlan[] {
  return dtos.map(normalizeBillingPlan);
}
