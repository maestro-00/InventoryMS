import { z } from "zod";

// These positions match InventoryX.Domain.Models.Auditing.NotificationType/Channel.
export const notificationTypeNames = [
  "LowStock",
  "OutOfStock",
  "ExpiringStock",
  "PoReceived",
  "PoOverdue",
  "TransferAwaitingReceipt",
  "LargeDiscount",
  "LargeRefund",
  "TillVariance",
  "UnusualVoids",
  "NegativeStock",
  "BillingFailure",
  "StockConflict",
  "DailyDigest",
  "WeeklyDigest",
] as const;

export const notificationChannelNames = ["InApp", "Email", "Push", "Sms"] as const;

export const notificationTypeSchema = z
  .number()
  .int()
  .min(0)
  .max(notificationTypeNames.length - 1);
export const notificationChannelSchema = z
  .number()
  .int()
  .min(0)
  .max(notificationChannelNames.length - 1);

export function notificationTypeName(type: number): string {
  return notificationTypeNames[type] ?? `Type ${String(type)}`;
}

export function notificationChannelName(channel: number): string {
  return notificationChannelNames[channel] ?? `Channel ${String(channel)}`;
}
