import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  apiQuantitySchema,
  toApiNullish,
  toApiNumber,
  utcInstantSchema,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { quantityStringSchema } from "../../../../shared/money/decimal";
import { saleSchema, type SaleRecord } from "../../sales/api/sales-api";
import {
  salePaymentInputSchema,
  type OnlineSaleRequest,
} from "../../checkout/online-checkout";

const DISPOSITIONS = ["ToStock", "Quarantine"] as const;
const REFUND_TENDERS = ["Original", "Cash"] as const;

export const returnLineInputSchema = z.object({
  saleLineId: uuidSchema,
  qty: quantityStringSchema,
  disposition: z.enum(DISPOSITIONS),
});

export const returnInputSchema = z.object({
  originalSaleId: uuidSchema,
  refundTender: z.enum(REFUND_TENDERS).default("Original"),
  authorizedBy: z.string().optional(),
  reason: z.string().optional(),
  lines: z.array(returnLineInputSchema).min(1),
});

export type ReturnInput = z.input<typeof returnInputSchema>;

export const exchangeInputSchema = returnInputSchema.extend({
  registerId: uuidSchema,
  shiftId: uuidSchema,
  newLines: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: quantityStringSchema,
        note: z.string().optional(),
      }),
    )
    .min(1),
  payments: z.array(salePaymentInputSchema),
});

export type ExchangeInput = z.input<typeof exchangeInputSchema>;

const returnLineSchema = z.object({
  id: uuidSchema,
  saleLineId: uuidSchema,
  productId: uuidSchema,
  variantId: uuidSchema.nullish(),
  qty: apiQuantitySchema,
  originalUnitPrice: apiDecimalSchema,
  originalTaxAmount: apiDecimalSchema,
  lineRefund: apiDecimalSchema,
  disposition: z.string(),
});

export const returnTransactionSchema = z.object({
  id: uuidSchema,
  originalSaleId: uuidSchema,
  exchangeSaleId: uuidSchema.nullish(),
  status: z.string(),
  authorizationRequired: z.boolean().default(false),
  authorizedBy: z.string().nullish(),
  refundTender: z.string(),
  refundTotal: apiDecimalSchema,
  occurredAt: utcInstantSchema,
  reason: z.string().nullish(),
  lines: z.array(returnLineSchema).default([]),
});

export type ReturnTransaction = z.infer<typeof returnTransactionSchema>;

function toReturnLines(lines: z.infer<typeof returnLineInputSchema>[]) {
  return lines.map((line) => ({
    saleLineId: line.saleLineId,
    qty: toApiNumber(line.qty),
    disposition: line.disposition,
  }));
}

function toSalePayments(payments: z.infer<typeof salePaymentInputSchema>[]) {
  return payments.map((payment) => ({
    tender: payment.tender,
    amount: toApiNumber(payment.amount),
    reference: toApiNullish(payment.reference),
  }));
}

export async function lookupSales(query: {
  receiptNumber?: string;
  search?: string;
}): Promise<SaleRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/sales/lookup", {
    params: {
      query: {
        ...(query.receiptNumber ? { receiptNumber: query.receiptNumber } : {}),
        ...(query.search ? { search: query.search } : {}),
      },
    },
  });
  return parseValue(outcome, saleSchema.array(), "Sale lookup");
}

export async function createReturn(input: ReturnInput): Promise<ReturnTransaction> {
  const parsed = returnInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/returns", {
    body: {
      originalSaleId: parsed.originalSaleId,
      refundTender: parsed.refundTender,
      authorizedBy: toApiNullish(parsed.authorizedBy),
      reason: toApiNullish(parsed.reason),
      lines: toReturnLines(parsed.lines),
    },
  });
  return parseValue(outcome, returnTransactionSchema, "Return");
}

export async function createExchange(input: ExchangeInput): Promise<ReturnTransaction> {
  const parsed = exchangeInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/returns/exchange", {
    body: {
      originalSaleId: parsed.originalSaleId,
      authorizedBy: toApiNullish(parsed.authorizedBy),
      reason: toApiNullish(parsed.reason),
      lines: toReturnLines(parsed.lines),
      registerId: parsed.registerId,
      shiftId: parsed.shiftId,
      newLines: parsed.newLines.map((line) => ({
        productId: line.productId,
        qty: toApiNumber(line.qty),
        note: toApiNullish(line.note),
      })),
      payments: toSalePayments(parsed.payments),
    },
  });
  return parseValue(outcome, returnTransactionSchema, "Exchange");
}

export async function voidSale(saleId: string, reason: string): Promise<SaleRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/sales/{id}/void", {
    params: { path: { id: saleId } },
    body: { reason },
  });
  return parseValue(outcome, saleSchema, "Voided sale");
}

export type { OnlineSaleRequest };
