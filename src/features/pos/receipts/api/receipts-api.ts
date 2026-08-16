import { z } from "zod";
import {
  ifMatchHeaders,
  inventoryxClient,
} from "../../../../shared/api/client/inventoryx-client";
import { parseResource, parseValue } from "../../../../shared/api/client/api-result";
import {
  utcInstantSchema,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";

const receiptSchema = z.object({
  id: uuidSchema,
  saleId: uuidSchema,
  number: z.string(),
  payloadJson: z.string(),
  createdAt: utcInstantSchema,
});

export type ReceiptRecord = z.infer<typeof receiptSchema>;

export const receiptTemplateSchema = z.object({
  logoUrl: z.string().optional(),
  businessName: z.string().min(1, "Enter the business name shown on receipts"),
  taxIdentifier: z.string().optional(),
  addressLine: z.string().optional(),
  phone: z.string().optional(),
  footer: z.string().optional(),
  returnPolicy: z.string().optional(),
});

export type ReceiptTemplate = z.infer<typeof receiptTemplateSchema>;

export const EMPTY_RECEIPT_TEMPLATE: ReceiptTemplate = { businessName: "" };

const receiptTemplateEnvelopeSchema = z.object({ templateJson: z.string() });

export async function fetchReceipt(saleId: string): Promise<ReceiptRecord> {
  const outcome = await inventoryxClient.GET("/api/v1/sales/{id}/receipt", {
    params: { path: { id: saleId } },
  });
  return parseValue(outcome, receiptSchema, "Receipt");
}

export async function fetchReceiptTemplate(): Promise<{
  template: ReceiptTemplate;
  etag: string | undefined;
}> {
  const outcome = await inventoryxClient.GET("/api/v1/tenant/receipt-template");
  const { value, etag } = parseResource(
    outcome,
    receiptTemplateEnvelopeSchema,
    "Receipt template",
  );
  const parsed = receiptTemplateSchema.safeParse(safeJson(value.templateJson));
  return {
    template: parsed.success ? parsed.data : EMPTY_RECEIPT_TEMPLATE,
    etag,
  };
}

export async function saveReceiptTemplate(
  template: ReceiptTemplate,
  etag?: string,
): Promise<ReceiptTemplate> {
  const outcome = await inventoryxClient.PUT("/api/v1/tenant/receipt-template", {
    body: { templateJson: JSON.stringify(receiptTemplateSchema.parse(template)) },
    headers: ifMatchHeaders(etag),
  });
  const envelope = parseValue(
    outcome,
    receiptTemplateEnvelopeSchema,
    "Receipt template",
  );
  const parsed = receiptTemplateSchema.safeParse(safeJson(envelope.templateJson));
  return parsed.success ? parsed.data : EMPTY_RECEIPT_TEMPLATE;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export const receiptDeliverySchema = z.object({
  saleId: uuidSchema,
  channel: z.string(),
  destination: z.string(),
  success: z.boolean(),
  message: z.string().nullish(),
});

export type ReceiptDeliveryResult = z.infer<typeof receiptDeliverySchema>;

export async function deliverReceipt(
  saleId: string,
  input: { channel: "Email" | "Sms" | "Qr"; destination: string },
): Promise<ReceiptDeliveryResult> {
  const outcome = await inventoryxClient.POST("/api/v1/sales/{id}/receipt/deliver", {
    params: { path: { id: saleId } },
    body: input,
  });
  return parseValue(outcome, receiptDeliverySchema, "Receipt delivery");
}
