import Decimal from "decimal.js";
import {
  completeOfflineSale,
  type OfflineCart,
} from "../../offline-sync/offline-sale-repository";
import type { CartState } from "../cart/cart-store";
import type { Tender } from "../sales/api/sales-api";
import type { ProvisionalReceipt } from "../../../shared/db/register-database";

export interface OfflineCompletionResult {
  clientSaleId: string;
  receipt: ProvisionalReceipt;
  cart: OfflineCart;
}

export function buildOfflineCart(
  cart: CartState,
  payments: Array<{ tender: Tender; amount: string; reference?: string }>,
): OfflineCart {
  const lines = cart.lines.map((line) => {
    const unitPrice = new Decimal(line.catalogUnitPrice);
    const qty = new Decimal(line.qty);
    const discount = new Decimal(line.lineDiscount || "0");
    const lineTotal = Decimal.max(qty.times(unitPrice).minus(discount), 0);
    return {
      productId: line.productId,
      qty: qty.toFixed(4),
      unitPrice: unitPrice.toFixed(4),
      lineDiscount: discount.toFixed(4),
      taxComponentsJson: "[]",
      taxAmount: "0.0000",
      lineTotal: lineTotal.toFixed(4),
      name: line.productName,
    };
  });

  const subtotal = lines.reduce(
    (sum, line) => sum.plus(line.lineTotal),
    new Decimal(0),
  );
  const discountTotal = lines.reduce(
    (sum, line) => sum.plus(line.lineDiscount),
    new Decimal(0),
  );

  return {
    lines,
    payments: payments.map((payment) => ({
      tender: payment.tender,
      amount: payment.amount,
      ...(payment.reference ? { reference: payment.reference } : {}),
    })),
    subtotal: subtotal.toFixed(4),
    discountTotal: discountTotal.toFixed(4),
    taxTotal: "0.0000",
    grandTotal: subtotal.toFixed(4),
  };
}

export async function completeEligibleOfflineSale(input: {
  tenantId: string;
  registerId: string;
  shiftId: string;
  cart: CartState;
  payments: Array<{ tender: Tender; amount: string; reference?: string }>;
}): Promise<OfflineCompletionResult> {
  if (input.cart.heldSaleId) {
    throw new Error("Held sales require a live connection to complete.");
  }
  const offlineCart = buildOfflineCart(input.cart, input.payments);
  const result = await completeOfflineSale({
    tenantId: input.tenantId,
    registerId: input.registerId,
    shiftId: input.shiftId,
    cart: offlineCart,
  });
  return { ...result, cart: offlineCart };
}
