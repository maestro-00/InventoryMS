import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  toApiNullish,
  toApiNumber,
} from "../../../../shared/api/client/boundary-schema";
import {
  completeSale,
  salePaymentInputSchema,
  type OnlineSaleRequest,
} from "../../checkout/online-checkout";
import { saleSchema, type SaleRecord, type Tender } from "../../sales/api/sales-api";

export async function holdSale(
  request: Omit<OnlineSaleRequest, "status" | "payments">,
): Promise<SaleRecord> {
  return completeSale({ ...request, status: "Held", payments: [] });
}

export async function fetchHeldSales(): Promise<SaleRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/sales/held");
  return parseValue(outcome, saleSchema.array(), "Held sales");
}

export async function fetchHeldSale(id: string): Promise<SaleRecord> {
  const outcome = await inventoryxClient.GET("/api/v1/sales/held/{id}", {
    params: { path: { id } },
  });
  return parseValue(outcome, saleSchema, "Held sale");
}

export async function completeHeldSale(
  saleId: string,
  payments: { tender: Tender; amount: string; reference?: string }[],
): Promise<SaleRecord> {
  const body = z.array(salePaymentInputSchema).parse(payments);
  const outcome = await inventoryxClient.POST("/api/v1/sales/{id}/complete", {
    params: { path: { id: saleId } },
    body: {
      payments: body.map((payment) => ({
        tender: payment.tender,
        amount: toApiNumber(payment.amount),
        reference: toApiNullish(payment.reference),
      })),
    },
  });
  return parseValue(outcome, saleSchema, "Sale");
}
