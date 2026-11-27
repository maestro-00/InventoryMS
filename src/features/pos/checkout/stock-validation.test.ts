import { describe, expect, it, vi } from "vitest";
import { checkSaleStock } from "./stock-validation";
import type { CartLine } from "../cart/cart-store";

const line: CartLine = {
  productId: "44444444-4444-4444-8444-444444444444",
  productName: "Sugar 1kg",
  allowFractional: false,
  catalogUnitPrice: "10",
  status: "Active",
  qty: "10",
  lineDiscount: "0",
  note: "",
};

describe("sale stock validation", () => {
  it("adds all location stock pages and reports the exact shortfall", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({
        items: [{ productId: line.productId, variantId: null, qtyOnHand: "3" }],
        page: 1,
        pageSize: 1,
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        items: [{ productId: line.productId, variantId: null, qtyOnHand: "2" }],
        page: 2,
        pageSize: 1,
        totalCount: 2,
      });

    const issues = await checkSaleStock([line], "location-id", load);

    expect(issues).toEqual([
      {
        productId: line.productId,
        message:
          "Sugar 1kg: 5 available, 10 requested. Reduce the quantity by 5 or add stock.",
      },
    ]);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
