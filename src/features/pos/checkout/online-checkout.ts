import { z } from "zod";
import { inventoryxClient } from "../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../shared/api/client/api-result";
import { toApiNullish, toApiNumber } from "../../../shared/api/client/boundary-schema";
import {
  decimalStringSchema,
  quantityStringSchema,
} from "../../../shared/money/decimal";
import { saleSchema, TENDERS, type SaleRecord } from "../sales/api/sales-api";

export const salePaymentInputSchema = z.object({
  tender: z.enum(TENDERS),
  amount: decimalStringSchema,
  reference: z.string().optional(),
});

export const onlineSaleSchema = z
  .object({
    clientSaleId: z.string().min(1),
    registerId: z.string().min(1),
    shiftId: z.string().min(1),
    status: z.enum(["Completed", "Held"]).default("Completed"),
    lines: z
      .array(
        z.object({
          productId: z.string().min(1),
          variantId: z.string().optional(),
          qty: quantityStringSchema,
          lineDiscount: decimalStringSchema.optional(),
          discountAuthorizedBy: z.string().optional(),
          note: z.string().optional(),
        }),
      )
      .min(1, "Add at least one line before taking payment"),
    payments: z.array(salePaymentInputSchema),
  })
  .superRefine((value, context) => {
    if (value.status !== "Held" && value.payments.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["payments"],
        message: "Record at least one payment",
      });
    }
  });

export type OnlineSaleRequest = z.input<typeof onlineSaleSchema>;

/**
 * The client sale identity is generated once per cart and reused for every retry so a
 * duplicated submission can never create a second sale or stock movement.
 */
export function newClientSaleId(): string {
  return crypto.randomUUID();
}

function toCreateSaleBody(request: z.infer<typeof onlineSaleSchema>) {
  return {
    clientSaleId: request.clientSaleId,
    registerId: request.registerId,
    shiftId: request.shiftId,
    status: request.status,
    lines: request.lines.map((line) => ({
      productId: line.productId,
      variantId: toApiNullish(line.variantId),
      qty: toApiNumber(line.qty),
      lineDiscount:
        line.lineDiscount !== undefined ? toApiNumber(line.lineDiscount) : 0,
      discountAuthorizedBy: toApiNullish(line.discountAuthorizedBy),
      note: toApiNullish(line.note),
    })),
    payments: request.payments.map((payment) => ({
      tender: payment.tender,
      amount: toApiNumber(payment.amount),
      reference: toApiNullish(payment.reference),
    })),
  };
}

export async function completeSale(request: OnlineSaleRequest): Promise<SaleRecord> {
  const body = onlineSaleSchema.parse(request);
  const outcome = await inventoryxClient.POST("/api/v1/sales", {
    body: toCreateSaleBody(body),
  });
  return parseValue(outcome, saleSchema, "Sale");
}

export type SubmissionState = "idle" | "submitting" | "completed";

/**
 * Blocks a second concurrent or repeated completion of the same cart while keeping the
 * first definitive outcome available to the workspace.
 */
export class SaleSubmissionGuard<TResult = SaleRecord> {
  private state: SubmissionState = "idle";
  private result: TResult | null = null;

  getState(): SubmissionState {
    return this.state;
  }

  getResult(): TResult | null {
    return this.result;
  }

  canSubmit(): boolean {
    return this.state === "idle";
  }

  async run(submit: () => Promise<TResult>): Promise<TResult> {
    if (this.state === "completed" && this.result) return this.result;
    if (this.state === "submitting") {
      throw new Error("A sale completion is already in progress");
    }
    this.state = "submitting";
    try {
      const sale = await submit();
      this.state = "completed";
      this.result = sale;
      return sale;
    } catch (error) {
      this.state = "idle";
      throw error;
    }
  }

  reset(): void {
    this.state = "idle";
    this.result = null;
  }
}
