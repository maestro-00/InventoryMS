import Decimal from "decimal.js";
import { quantityStringSchema } from "../../../shared/money/decimal";
import { newClientSaleId } from "../checkout/online-checkout";
import { saleSchema, type SaleRecord, type Tender } from "../sales/api/sales-api";

export interface CartProduct {
  productId: string;
  productName: string;
  barcode?: string;
  allowFractional: boolean;
  catalogUnitPrice: string;
  taxTreatmentCode?: string;
  status: string;
}

export interface CartLine extends CartProduct {
  heldLineId?: string;
  qty: string;
  lineDiscount: string;
  discountPercent?: string | undefined;
  note: string;
}

export interface CartTender {
  id: string;
  tender: Tender;
  amount: string;
  reference?: string;
}

export interface CartState {
  clientSaleId: string;
  lines: CartLine[];
  tenders: CartTender[];
  heldSaleId: string | null;
  quote: SaleRecord | null;
  completed: boolean;
}

export const EMPTY_CART_STATE: CartState = {
  clientSaleId: "",
  lines: [],
  tenders: [],
  heldSaleId: null,
  quote: null,
  completed: false,
};

export function createCart(): CartState {
  return {
    ...EMPTY_CART_STATE,
    clientSaleId: newClientSaleId(),
    lines: [],
    tenders: [],
  };
}

export type CartAction =
  | { type: "scan"; product: CartProduct }
  | { type: "setQuantity"; productId: string; qty: string }
  | { type: "setDiscount"; productId: string; lineDiscount: string }
  | { type: "setDiscountPercent"; productId: string; percent: string }
  | { type: "setNote"; productId: string; note: string }
  | { type: "removeLine"; productId: string }
  | { type: "addTender"; tender: Tender; amount: string; reference?: string }
  | { type: "setTenderAmount"; id: string; amount: string }
  | { type: "removeTender"; id: string }
  | { type: "applyQuote"; quote: SaleRecord }
  | { type: "hold"; heldSaleId: string; quote: SaleRecord }
  | { type: "markCompleted" }
  | { type: "reset" };

export function scanProduct(product: CartProduct): CartAction {
  return { type: "scan", product };
}
export function setQuantity(productId: string, qty: string): CartAction {
  return { type: "setQuantity", productId, qty };
}
export function setDiscount(productId: string, lineDiscount: string): CartAction {
  return { type: "setDiscount", productId, lineDiscount };
}
export function setDiscountPercent(productId: string, percent: string): CartAction {
  return { type: "setDiscountPercent", productId, percent };
}
export function setNote(productId: string, note: string): CartAction {
  return { type: "setNote", productId, note };
}
export function removeLine(productId: string): CartAction {
  return { type: "removeLine", productId };
}
export function addTender(input: {
  tender: Tender;
  amount: string;
  reference?: string;
}): CartAction {
  return { type: "addTender", ...input };
}
export function setTenderAmount(id: string, amount: string): CartAction {
  return { type: "setTenderAmount", id, amount };
}
export function removeTender(id: string): CartAction {
  return { type: "removeTender", id };
}
export function applyQuote(quote: SaleRecord): CartAction {
  return { type: "applyQuote", quote };
}
export function markCompleted(): CartAction {
  return { type: "markCompleted" };
}

function incrementQty(qty: string): string {
  const next = new Decimal(qty).plus(1);
  return qty.includes(".") ? next.toFixed(3) : next.toFixed(0);
}

function discountAmount(line: CartLine, qty: string, percent: string): string {
  if (!/^\d*(?:\.\d{0,2})?$/.test(percent) || percent === "") return "0";
  try {
    return new Decimal(line.catalogUnitPrice)
      .times(qty)
      .times(percent)
      .div(100)
      .toFixed(4);
  } catch {
    return "0";
  }
}

export function discountPercentForLine(line: CartLine): string {
  if (line.discountPercent !== undefined) return line.discountPercent;
  try {
    const gross = new Decimal(line.catalogUnitPrice).times(line.qty);
    return gross.gt(0)
      ? new Decimal(line.lineDiscount)
          .div(gross)
          .times(100)
          .toDecimalPlaces(2)
          .toString()
      : "0";
  } catch {
    return "0";
  }
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "scan": {
      const existing = state.lines.find(
        (line) => line.productId === action.product.productId,
      );
      if (existing) {
        return {
          ...state,
          quote: null,
          lines: state.lines.map((line) =>
            line.productId === action.product.productId
              ? {
                  ...line,
                  qty: incrementQty(line.qty),
                  ...(line.discountPercent !== undefined
                    ? {
                        lineDiscount: discountAmount(
                          line,
                          incrementQty(line.qty),
                          line.discountPercent,
                        ),
                      }
                    : {}),
                }
              : line,
          ),
        };
      }
      return {
        ...state,
        quote: null,
        lines: [
          ...state.lines,
          {
            ...action.product,
            qty: "1",
            lineDiscount: "0",
            discountPercent: "0",
            note: "",
          },
        ],
      };
    }
    case "setQuantity":
      return {
        ...state,
        quote: null,
        lines: state.lines.map((line) =>
          line.productId === action.productId
            ? {
                ...line,
                qty: action.qty,
                ...(line.discountPercent !== undefined
                  ? {
                      lineDiscount: discountAmount(
                        line,
                        action.qty,
                        line.discountPercent,
                      ),
                    }
                  : {}),
              }
            : line,
        ),
      };
    case "setDiscount":
      return {
        ...state,
        quote: null,
        lines: state.lines.map((line) =>
          line.productId === action.productId
            ? { ...line, lineDiscount: action.lineDiscount, discountPercent: undefined }
            : line,
        ),
      };
    case "setDiscountPercent":
      return {
        ...state,
        quote: null,
        lines: state.lines.map((line) =>
          line.productId === action.productId
            ? {
                ...line,
                discountPercent: action.percent,
                lineDiscount: discountAmount(line, line.qty, action.percent),
              }
            : line,
        ),
      };
    case "setNote":
      return {
        ...state,
        quote: state.heldSaleId ? null : state.quote,
        lines: state.lines.map((line) =>
          line.productId === action.productId ? { ...line, note: action.note } : line,
        ),
      };
    case "removeLine": {
      const lines = state.lines.filter((line) => line.productId !== action.productId);
      // Once every recalled line is gone, the remaining products form a new sale.
      // Keep the original held sale available for a later recall.
      if (
        state.heldSaleId &&
        state.lines.some((line) => line.heldLineId) &&
        !lines.some((line) => line.heldLineId)
      ) {
        return { ...createCart(), lines };
      }
      return { ...state, quote: null, lines };
    }
    case "addTender":
      return {
        ...state,
        tenders: [
          ...state.tenders,
          {
            id: crypto.randomUUID(),
            tender: action.tender,
            amount: action.amount,
            ...(action.reference ? { reference: action.reference } : {}),
          },
        ],
      };
    case "setTenderAmount":
      return {
        ...state,
        tenders: state.tenders.map((tender) =>
          tender.id === action.id ? { ...tender, amount: action.amount } : tender,
        ),
      };
    case "removeTender":
      return {
        ...state,
        tenders: state.tenders.filter((tender) => tender.id !== action.id),
      };
    case "applyQuote":
      return { ...state, quote: saleSchema.parse(action.quote) };
    case "hold":
      return {
        ...state,
        heldSaleId: action.heldSaleId,
        quote: saleSchema.parse(action.quote),
      };
    case "markCompleted":
      return { ...state, completed: true };
    case "reset":
      return createCart();
  }
}

export function selectServerTotals(cart: CartState): {
  subtotal: string;
  taxTotal: string;
  grandTotal: string;
  changeDue: string;
} | null {
  if (!cart.quote) return null;
  return {
    subtotal: cart.quote.subtotal,
    taxTotal: cart.quote.taxTotal,
    grandTotal: cart.quote.grandTotal,
    changeDue: cart.quote.changeDue,
  };
}

export function cartErrors(cart: CartState): string[] {
  if (cart.completed) return ["This sale is already completed."];
  if (cart.lines.length === 0)
    return ["Add at least one product before taking payment."];
  const errors =
    cart.heldSaleId && cart.lines.some((line) => !line.heldLineId)
      ? [
          "Added products cannot be included in a recalled sale. Remove the recalled products to start a new sale, or remove the added products to complete the held sale.",
        ]
      : [];
  return [
    ...errors,
    ...cart.lines.flatMap((line) => {
      const messages: string[] = [];
      if (!quantityStringSchema.safeParse(line.qty).success) {
        messages.push(
          `${line.productName}: enter a numeric quantity with at most three decimal places.`,
        );
      } else if (new Decimal(line.qty).lte(0)) {
        messages.push(`${line.productName}: enter a quantity greater than zero.`);
      } else if (!line.allowFractional && !new Decimal(line.qty).isInteger()) {
        messages.push(
          `${line.productName}: this product does not allow fractional quantities.`,
        );
      }
      if (
        line.discountPercent !== undefined &&
        line.discountPercent !== "" &&
        (!/^\d+(?:\.\d{0,2})?$/.test(line.discountPercent) ||
          new Decimal(line.discountPercent).gt(100))
      ) {
        messages.push(`${line.productName}: enter a discount from 0% to 100%.`);
      }
      return messages;
    }),
  ];
}

export function toSaleLines(cart: CartState) {
  return cart.lines.map((line) => ({
    productId: line.productId,
    qty: line.qty,
    ...(line.lineDiscount !== "0" ? { lineDiscount: line.lineDiscount } : {}),
    ...(line.note ? { note: line.note } : {}),
  }));
}
