import Decimal from "decimal.js";
import { z } from "zod";

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;
const QUANTITY_PATTERN = /^-?\d+(?:\.\d{1,3})?$/;

export const decimalStringSchema = z
  .string()
  .regex(DECIMAL_PATTERN, "Money must be a decimal string");

export const quantityStringSchema = z
  .string()
  .regex(QUANTITY_PATTERN, "Quantity allows at most three decimal places");

export function isDecimalString(value: unknown): value is string {
  return typeof value === "string" && DECIMAL_PATTERN.test(value);
}

export function addMoney(left: string, right: string): string {
  return new Decimal(decimalStringSchema.parse(left))
    .plus(decimalStringSchema.parse(right))
    .toFixed(2);
}

export function multiplyQuantity(quantity: string, factor: string): string {
  return new Decimal(quantityStringSchema.parse(quantity))
    .times(quantityStringSchema.parse(factor))
    .toFixed(3);
}

export function formatGhanaMoney(amount: string, currency = "GHS"): string {
  const value = new Decimal(decimalStringSchema.parse(amount)).toNumber();
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
