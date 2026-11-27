import { describe, expect, it } from "vitest";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us2 from "../../../../tests/fixtures/provider/us2";
import { saleSchema } from "../sales/api/sales-api";
import {
  addTender,
  applyQuote,
  cartErrors,
  cartReducer,
  createCart,
  EMPTY_CART_STATE,
  markCompleted,
  removeLine,
  removeTender,
  scanProduct,
  selectServerTotals,
  setDiscount,
  setDiscountPercent,
  setNote,
  setQuantity,
  setTenderAmount,
  toSaleLines,
  type CartProduct,
} from "./cart-store";

const sugar: CartProduct = {
  productId: us1.PRODUCT_ID,
  productName: "Sugar 1kg",
  barcode: "6001234567890",
  allowFractional: false,
  catalogUnitPrice: "10",
  taxTreatmentCode: "GH-STD",
  status: "Active",
};

const oil: CartProduct = {
  productId: us2.OIL_ID,
  productName: "Cooking oil 1L",
  barcode: "6001234567892",
  allowFractional: true,
  catalogUnitPrice: "18",
  taxTreatmentCode: "GH-STD",
  status: "Active",
};

describe("scan dedupe and quantities", () => {
  it("adds a new line on the first scan and increments quantity on a repeat scan", () => {
    const first = cartReducer(createCart(), scanProduct(sugar));
    const second = cartReducer(first, scanProduct(sugar));

    expect(first.lines).toHaveLength(1);
    expect(first.lines[0]?.qty).toBe("1");
    expect(second.lines).toHaveLength(1);
    expect(second.lines[0]?.qty).toBe("2");
  });

  it("rejects a fractional quantity on an integral product and accepts one when allowed", () => {
    const withSugar = cartReducer(createCart(), scanProduct(sugar));
    const fractionalSugar = cartReducer(withSugar, setQuantity(us1.PRODUCT_ID, "1.5"));
    expect(cartErrors(fractionalSugar)).toContain(
      "Sugar 1kg: this product does not allow fractional quantities.",
    );

    const withOil = cartReducer(createCart(), scanProduct(oil));
    const fractionalOil = cartReducer(withOil, setQuantity(us2.OIL_ID, "1.250"));
    expect(cartErrors(fractionalOil)).toEqual([]);
    expect(fractionalOil.lines[0]?.qty).toBe("1.250");
  });

  it("stores a line discount and note without computing a new total", () => {
    const withLine = cartReducer(createCart(), scanProduct(sugar));
    const discounted = cartReducer(withLine, setDiscount(us1.PRODUCT_ID, "1.00"));
    const noted = cartReducer(discounted, setNote(us1.PRODUCT_ID, "Opened bag"));

    expect(noted.lines[0]?.lineDiscount).toBe("1.00");
    expect(noted.lines[0]?.note).toBe("Opened bag");
    expect(selectServerTotals(noted)).toBeNull();
  });

  it("turns a percentage into a line discount and keeps it when quantity changes", () => {
    const cart = cartReducer(createCart(), scanProduct(sugar));
    const discounted = cartReducer(cart, setDiscountPercent(us1.PRODUCT_ID, "5"));
    expect(discounted.lines[0]?.lineDiscount).toBe("0.5000");
    expect(toSaleLines(discounted)[0]?.lineDiscount).toBe("0.5000");

    const twoUnits = cartReducer(discounted, setQuantity(us1.PRODUCT_ID, "2"));
    expect(twoUnits.lines[0]?.discountPercent).toBe("5");
    expect(twoUnits.lines[0]?.lineDiscount).toBe("1.0000");
  });

  it("removes a line without touching remaining identities", () => {
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = cartReducer(cart, scanProduct(oil));
    cart = cartReducer(cart, removeLine(us1.PRODUCT_ID));

    expect(cart.lines.map((line) => line.productId)).toEqual([us2.OIL_ID]);
  });

  it("starts a new sale when the last recalled product is removed", () => {
    const savedLine = cartReducer(createCart(), scanProduct(sugar)).lines[0];
    const heldLine = us2.heldSale.lines[0];
    if (!savedLine || !heldLine) throw new Error("Expected held sale line");
    const held = {
      ...cartReducer(createCart(), scanProduct(sugar)),
      heldSaleId: us2.HELD_SALE_ID,
      clientSaleId: us2.heldSale.clientSaleId,
      lines: [
        {
          ...savedLine,
          heldLineId: heldLine.id,
        },
      ],
    };
    const mixed = cartReducer(held, scanProduct(oil));
    expect(cartErrors(mixed)).toContain(
      "Added products cannot be included in a recalled sale. Remove the recalled products to start a new sale, or remove the added products to complete the held sale.",
    );

    const fresh = cartReducer(mixed, removeLine(sugar.productId));
    expect(fresh.lines.map((line) => line.productId)).toEqual([oil.productId]);
    expect(fresh.heldSaleId).toBeNull();
    expect(fresh.clientSaleId).not.toBe(held.clientSaleId);
    expect(cartErrors(fresh)).toEqual([]);
  });
});

describe("tenders and duplicate completion", () => {
  it("records split tenders as cashier-entered amounts, not derived change", () => {
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = cartReducer(cart, addTender({ tender: "Cash", amount: "50.00" }));
    cart = cartReducer(
      cart,
      addTender({ tender: "Card", amount: "35.00", reference: "AUTH-44" }),
    );
    cart = cartReducer(cart, setTenderAmount(cart.tenders[0]?.id ?? "", "40.00"));

    expect(cart.tenders).toHaveLength(2);
    expect(cart.tenders[0]?.amount).toBe("40.00");
    expect(cart.tenders[1]?.reference).toBe("AUTH-44");

    cart = cartReducer(cart, removeTender(cart.tenders[1]?.id ?? ""));
    expect(cart.tenders).toHaveLength(1);
  });

  it("exposes server quote totals and blocks a second completion of the same cart", () => {
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = cartReducer(cart, applyQuote(saleSchema.parse(us1.completedSale)));

    const totals = selectServerTotals(cart);
    expect(totals?.grandTotal).toBe("23");
    expect(totals?.changeDue).toBe("2");

    cart = cartReducer(cart, markCompleted());
    expect(cart.completed).toBe(true);
    expect(cartErrors(cart)).toContain("This sale is already completed.");
  });

  it("starts from an empty cart with a fresh client identity", () => {
    expect(EMPTY_CART_STATE.lines).toEqual([]);
    expect(createCart().clientSaleId).not.toBe(createCart().clientSaleId);
    expect(cartErrors(createCart())).toContain(
      "Add at least one product before taking payment.",
    );
  });

  it("explains when a sale quantity must be greater than zero", () => {
    const cart = cartReducer(
      cartReducer(createCart(), scanProduct(sugar)),
      setQuantity(sugar.productId, "0"),
    );
    expect(cartErrors(cart)).toContain(
      "Sugar 1kg: enter a quantity greater than zero.",
    );
  });

  it("holds a server quote, then resets to a new cart identity", () => {
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = cartReducer(cart, {
      type: "hold",
      heldSaleId: us2.HELD_SALE_ID,
      quote: saleSchema.parse(us2.heldSale),
    });
    expect(cart.heldSaleId).toBe(us2.HELD_SALE_ID);
    expect(selectServerTotals(cart)?.grandTotal).toBe("11.5");

    const reset = cartReducer(cart, { type: "reset" });
    expect(reset.lines).toEqual([]);
    expect(reset.heldSaleId).toBeNull();
    expect(reset.clientSaleId).not.toBe(cart.clientSaleId);
  });

  it("increments a fractional quantity to three decimal places and omits empty notes", () => {
    let cart = cartReducer(createCart(), scanProduct(oil));
    cart = cartReducer(cart, setQuantity(us2.OIL_ID, "1.250"));
    cart = cartReducer(cart, scanProduct(oil));
    expect(cart.lines[0]?.qty).toBe("2.250");

    cart = cartReducer(cart, setDiscount(us2.OIL_ID, "0.50"));
    cart = cartReducer(cart, setNote(us2.OIL_ID, "Opened"));
    expect(toSaleLines(cart)).toEqual([
      {
        productId: us2.OIL_ID,
        qty: "2.250",
        lineDiscount: "0.50",
        note: "Opened",
      },
    ]);
  });
});
