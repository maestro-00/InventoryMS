import Decimal from "decimal.js";
import type { TaxTreatment } from "../../catalogue/products/api/products-api";
import type { CartState } from "./cart-store";

type TaxDefinition = {
  code?: string;
  name?: string;
  rate: number;
  base?: string;
};

export type SalePreview = {
  lines: Array<{
    productId: string;
    unitPrice: string;
    gross: string | null;
    discount: string;
    total: string | null;
  }>;
  subtotal: string | null;
  discountTotal: string | null;
  taxes: Array<{ name: string; amount: string }>;
  taxTotal: string | null;
  grandTotal: string | null;
  provisional: boolean;
};

const money = (value: Decimal) => value.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
const taxMoney = (value: Decimal) => value.toDecimalPlaces(4, Decimal.ROUND_HALF_EVEN);

export function previewSale(
  cart: CartState,
  treatments: TaxTreatment[] | undefined,
  isOnline: boolean,
): SalePreview {
  if (cart.heldSaleId && cart.quote) {
    const quoteLines = cart.quote.lines;
    const quoteTaxes = new Map<string, Decimal>();
    for (const line of quoteLines) {
      try {
        const components = JSON.parse(line.taxComponents) as Array<{
          code?: string;
          name?: string;
          amount: number;
        }>;
        for (const component of components) {
          const name = component.code || component.name || "Tax";
          quoteTaxes.set(
            name,
            (quoteTaxes.get(name) ?? new Decimal(0)).plus(component.amount),
          );
        }
      } catch {
        // The quote's tax total remains authoritative if component details are unavailable.
      }
    }
    return {
      lines: cart.lines.map((line) => {
        const matching = quoteLines.filter((item) => item.productId === line.productId);
        const total = matching.reduce(
          (sum, item) => sum.plus(item.lineTotal),
          new Decimal(0),
        );
        return {
          productId: line.productId,
          unitPrice: matching[0]?.unitPrice ?? line.catalogUnitPrice,
          gross: matching.length
            ? money(
                new Decimal(line.qty).times(
                  matching[0]?.unitPrice ?? line.catalogUnitPrice,
                ),
              ).toString()
            : null,
          discount: line.lineDiscount,
          total: matching.length ? total.toString() : null,
        };
      }),
      subtotal: cart.quote.subtotal,
      discountTotal: cart.quote.discountTotal,
      taxes: [...quoteTaxes].map(([name, amount]) => ({
        name,
        amount: amount.toString(),
      })),
      taxTotal: cart.quote.taxTotal,
      grandTotal: cart.quote.grandTotal,
      provisional: false,
    };
  }
  const byCode = new Map(treatments?.map((item) => [item.code, item]) ?? []);
  const taxes = new Map<string, Decimal>();
  let subtotal = new Decimal(0);
  let discountTotal = new Decimal(0);
  let taxTotal = new Decimal(0);

  const lines = cart.lines.map((line) => {
    const unitPrice = new Decimal(line.catalogUnitPrice);
    const discount = new Decimal(line.lineDiscount || "0");
    const qty = /^\d+(?:\.\d{1,3})?$/.test(line.qty) ? new Decimal(line.qty) : null;
    const valid =
      qty?.gt(0) &&
      (!isOnline || !line.taxTreatmentCode || byCode.has(line.taxTreatmentCode));
    if (!qty || !valid) {
      return {
        productId: line.productId,
        unitPrice: unitPrice.toString(),
        gross: null,
        discount: discount.toString(),
        total: null,
      };
    }

    const gross = money(qty.times(unitPrice));
    const net = taxMoney(qty.times(unitPrice).minus(discount));
    let definitions: TaxDefinition[] = [];
    if (isOnline && line.taxTreatmentCode) {
      try {
        const parsed: unknown = JSON.parse(
          byCode.get(line.taxTreatmentCode)?.componentsJson ?? "[]",
        );
        if (!Array.isArray(parsed)) throw new Error("Invalid tax components");
        definitions = parsed as TaxDefinition[];
      } catch {
        return {
          productId: line.productId,
          unitPrice: unitPrice.toString(),
          gross: gross.toString(),
          discount: discount.toString(),
          total: null,
        };
      }
    }
    let levies = new Decimal(0);
    let lineTax = new Decimal(0);
    for (const definition of definitions.filter(
      (item) => !item.base || item.base === "net",
    )) {
      const amount = taxMoney(net.times(definition.rate));
      const name = definition.code || definition.name || "Tax";
      taxes.set(name, (taxes.get(name) ?? new Decimal(0)).plus(amount));
      levies = levies.plus(amount);
      lineTax = lineTax.plus(amount);
    }
    for (const definition of definitions.filter(
      (item) => item.base === "net_plus_levies",
    )) {
      const amount = taxMoney(net.plus(levies).times(definition.rate));
      const name = definition.code || definition.name || "Tax";
      taxes.set(name, (taxes.get(name) ?? new Decimal(0)).plus(amount));
      lineTax = lineTax.plus(amount);
    }
    lineTax = money(lineTax);
    subtotal = subtotal.plus(gross);
    discountTotal = discountTotal.plus(discount);
    taxTotal = taxTotal.plus(lineTax);
    return {
      productId: line.productId,
      unitPrice: unitPrice.toString(),
      gross: gross.toString(),
      discount: discount.toString(),
      total: money(net.plus(lineTax)).toString(),
    };
  });
  const incomplete = lines.some((line) => line.total === null);

  return {
    lines,
    subtotal: incomplete ? null : subtotal.toString(),
    discountTotal: incomplete ? null : discountTotal.toString(),
    taxes: incomplete
      ? []
      : [...taxes].map(([name, amount]) => ({ name, amount: amount.toString() })),
    taxTotal: incomplete ? null : taxTotal.toString(),
    grandTotal: incomplete
      ? null
      : money(subtotal.minus(discountTotal).plus(taxTotal)).toString(),
    provisional: !isOnline,
  };
}

export function paymentDifference(
  total: string | null,
  paid: string,
): { kind: "change" | "remaining"; amount: string } | null {
  if (total === null || !/^\d+(?:\.\d+)?$/.test(paid)) return null;
  const difference = new Decimal(paid).minus(total);
  return difference.gte(0)
    ? { kind: "change", amount: money(difference).toString() }
    : { kind: "remaining", amount: money(difference.negated()).toString() };
}
