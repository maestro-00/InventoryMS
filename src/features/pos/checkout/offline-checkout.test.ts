import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  openRegisterDatabase,
  partitionKey,
  replaceSnapshotAtomically,
} from "../../../shared/db/register-database";
import {
  cartReducer,
  createCart,
  scanProduct,
  type CartProduct,
} from "../cart/cart-store";
import { buildOfflineCart, completeEligibleOfflineSale } from "./offline-checkout";

const tenantId = "11111111-1111-4111-8111-111111111111";
const registerId = "22222222-2222-4222-8222-222222222222";
const shiftId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";

const sugar: CartProduct = {
  productId,
  productName: "Sugar 1kg",
  barcode: "6001234567890",
  allowFractional: false,
  catalogUnitPrice: "10",
  taxTreatmentCode: "GH-STD",
  status: "Active",
};

async function seedReady() {
  const db = openRegisterDatabase(tenantId, registerId);
  await replaceSnapshotAtomically(db, {
    meta: {
      id: partitionKey(tenantId, registerId),
      tenantId,
      registerId,
      shiftId,
      locked: false,
      readinessDeadline: new Date(Date.now() + 3_600_000).toISOString(),
      watermark: "AAA=",
      bundleVersion: "2026.08.offline-prep.1",
      preparedAt: new Date().toISOString(),
    },
    products: [
      {
        id: productId,
        name: "Sugar",
        sku: "SUG",
        barcode: "6001",
        sellingPrice: "10.0000",
        taxTreatmentId: null,
        allowFractional: false,
        trackingMode: "Simple",
        allowsDiscount: true,
        version: "1",
      },
    ],
    stock: [
      {
        id: `${productId}::`,
        productId,
        variantId: null,
        batchId: null,
        qtyOnHand: "10.0000",
        qtyInTransit: "0.0000",
        qtyQuarantine: "0.0000",
        version: "1",
      },
    ],
    taxes: [],
  });
  db.close();
}

describe("buildOfflineCart", () => {
  it("computes provisional line and cart totals from catalog prices", () => {
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = {
      ...cart,
      lines: cart.lines.map((line) => ({ ...line, lineDiscount: "1.50" })),
    };

    const offline = buildOfflineCart(cart, [
      { tender: "Cash", amount: "8.50" },
      { tender: "Card", amount: "0.00", reference: "AUTH-1" },
    ]);

    expect(offline.lines).toEqual([
      {
        productId,
        qty: "1.0000",
        unitPrice: "10.0000",
        lineDiscount: "1.5000",
        taxComponentsJson: "[]",
        taxAmount: "0.0000",
        lineTotal: "8.5000",
        name: "Sugar 1kg",
      },
    ]);
    expect(offline.subtotal).toBe("8.5000");
    expect(offline.discountTotal).toBe("1.5000");
    expect(offline.grandTotal).toBe("8.5000");
    expect(offline.payments).toEqual([
      { tender: "Cash", amount: "8.50" },
      { tender: "Card", amount: "0.00", reference: "AUTH-1" },
    ]);
  });

  it("clamps a negative provisional line total at zero", () => {
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = {
      ...cart,
      lines: cart.lines.map((line) => ({ ...line, lineDiscount: "50" })),
    };

    const offline = buildOfflineCart(cart, [{ tender: "Cash", amount: "0" }]);
    expect(offline.lines[0]?.lineTotal).toBe("0.0000");
    expect(offline.grandTotal).toBe("0.0000");
  });

  it("treats a blank line discount as zero", () => {
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = {
      ...cart,
      lines: cart.lines.map((line) => ({ ...line, lineDiscount: "" })),
    };

    const offline = buildOfflineCart(cart, [{ tender: "Cash", amount: "10" }]);
    expect(offline.lines[0]?.lineDiscount).toBe("0.0000");
    expect(offline.lines[0]?.lineTotal).toBe("10.0000");
  });
});

describe("completeEligibleOfflineSale", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
    await seedReady();
  });

  it("persists a provisional receipt for an eligible cart", async () => {
    const cart = cartReducer(createCart(), scanProduct(sugar));
    const result = await completeEligibleOfflineSale({
      tenantId,
      registerId,
      shiftId,
      cart,
      payments: [{ tender: "Cash", amount: "10.00" }],
    });

    expect(result.clientSaleId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.receipt.label).toBe("Pending sync");
    expect(result.cart.grandTotal).toBe("10.0000");
  });

  it("rejects held sales that still need a live connection", async () => {
    const cart = {
      ...cartReducer(createCart(), scanProduct(sugar)),
      heldSaleId: "c8888888-8888-4888-8888-888888888888",
    };

    await expect(
      completeEligibleOfflineSale({
        tenantId,
        registerId,
        shiftId,
        cart,
        payments: [{ tender: "Cash", amount: "10.00" }],
      }),
    ).rejects.toThrow(/held sales require a live connection/i);
  });
});
