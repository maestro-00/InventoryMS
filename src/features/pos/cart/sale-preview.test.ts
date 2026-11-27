import { describe, expect, it } from "vitest";
import { previewSale, paymentDifference } from "./sale-preview";
import type { CartState } from "./cart-store";
import type { TaxTreatment } from "../../catalogue/products/api/products-api";
import { saleSchema } from "../sales/api/sales-api";
import { heldSale } from "../../../../tests/fixtures/provider/us2";

const cart: CartState = {
  clientSaleId: "sale",
  tenders: [],
  heldSaleId: null,
  quote: null,
  completed: false,
  lines: [
    {
      productId: "milk",
      productName: "Milk",
      allowFractional: false,
      catalogUnitPrice: "10.00",
      taxTreatmentCode: "GH-STD",
      status: "Active",
      qty: "3",
      lineDiscount: "1.50",
      note: "",
    },
  ],
};

const treatments: TaxTreatment[] = [
  {
    id: "tax",
    code: "GH-STD",
    name: "Ghana standard",
    countryCode: "GH",
    componentsJson: JSON.stringify([
      { code: "NHIL", rate: 0.025, base: "net" },
      { code: "GETFUND", rate: 0.025, base: "net" },
      { code: "VAT", rate: 0.15, base: "net_plus_levies" },
    ]),
  },
];

describe("sale preview", () => {
  it("shows unit, line, levy, VAT, total and cash change before payment", () => {
    const preview = previewSale(cart, treatments, true);
    expect(preview.lines[0]?.unitPrice).toBe("10");
    expect(preview.lines[0]?.total).toBe("34.41");
    expect(preview.subtotal).toBe("30");
    expect(preview.discountTotal).toBe("1.5");
    expect(preview.taxes).toEqual([
      { name: "NHIL", amount: "0.7125" },
      { name: "GETFUND", amount: "0.7125" },
      { name: "VAT", amount: "4.4888" },
    ]);
    expect(preview.grandTotal).toBe("34.41");
    expect(paymentDifference(preview.grandTotal, "40")).toEqual({
      kind: "change",
      amount: "5.59",
    });
    expect(paymentDifference(preview.grandTotal, "20")).toEqual({
      kind: "remaining",
      amount: "14.41",
    });
  });

  it("does not invent a tax-inclusive total when current rates are unavailable", () => {
    expect(previewSale(cart, undefined, true).grandTotal).toBeNull();
    expect(previewSale(cart, undefined, false).grandTotal).toBe("28.5");
  });

  it("uses the saved server totals when a held sale is recalled", () => {
    const original = cart.lines[0];
    if (!original) throw new Error("Missing test line");
    const recalled = previewSale(
      {
        ...cart,
        heldSaleId: heldSale.id,
        quote: saleSchema.parse(heldSale),
        lines: [
          {
            ...original,
            productId: heldSale.lines[0]?.productId ?? original.productId,
            qty: "1",
          },
        ],
      },
      undefined,
      true,
    );
    expect(recalled.grandTotal).toBe("11.5");
    expect(recalled.taxes).toEqual([{ name: "VAT", amount: "1.5" }]);
  });
});
