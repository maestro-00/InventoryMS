import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { renderWithProviders } from "../../../shared/test/render";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us2 from "../../../../tests/fixtures/provider/us2";
import { PaymentPanel } from "./payment-panel";
import { HeldSalesPanel } from "../held-sales/held-sales-panel";
import { detectHeldSaleDrift } from "../held-sales/held-sale-drift";
import {
  applyQuote,
  cartReducer,
  createCart,
  scanProduct,
  type CartProduct,
} from "../cart/cart-store";
import { productSchema } from "../../catalogue/products/api/products-api";
import { saleSchema } from "../sales/api/sales-api";

const sugar: CartProduct = {
  productId: us1.PRODUCT_ID,
  productName: "Sugar 1kg",
  barcode: "6001234567890",
  allowFractional: false,
  catalogUnitPrice: "10",
  taxTreatmentCode: "GH-STD",
  status: "Active",
};

function checkoutHandlers() {
  return [
    http.post("*/api/v1/sales", async ({ request }) => {
      const body = (await request.json()) as { status?: string };
      if (body.status === "Held") {
        return HttpResponse.json(us2.heldSale, { status: 201 });
      }
      return HttpResponse.json(us2.splitCompletedSale, { status: 201 });
    }),
    http.get("*/api/v1/sales/held", () => HttpResponse.json([us2.staleHeldSale])),
    http.get(`*/api/v1/sales/held/${us2.HELD_SALE_ID}`, () =>
      HttpResponse.json(us2.staleHeldSale),
    ),
    http.post(`*/api/v1/sales/${us2.HELD_SALE_ID}/complete`, () =>
      HttpResponse.json(us1.completedSale),
    ),
    http.get("*/api/v1/products", () =>
      HttpResponse.json({
        items: [us1.productRecord],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      }),
    ),
    http.get("*/api/v1/stock", () =>
      HttpResponse.json({
        items: [us1.stockLevel],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      }),
    ),
  ];
}

describe("split tenders and change", () => {
  it("submits Cash and Card together and shows the server change due", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    server.use(...checkoutHandlers());

    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = cartReducer(cart, applyQuote(saleSchema.parse(us2.splitCompletedSale)));

    renderWithProviders(
      <PaymentPanel
        cart={cart}
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        tenantId={us1.TENANT_ID}
        isOnline
        onCartChange={() => undefined}
        onCompleted={onCompleted}
        onProvisionalCompleted={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/cash amount/i), "50.00");
    await user.click(screen.getByRole("button", { name: /add card tender/i }));
    await user.type(screen.getByLabelText(/card amount/i), "35.00");
    await user.type(screen.getByLabelText(/card reference/i), "AUTH-44");
    await user.click(screen.getByRole("button", { name: /take split payment/i }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ changeDue: "1.05" }),
      );
    });
  });

  it("pauses completion when InventoryX requires manager authorization", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/sales", () =>
        HttpResponse.json(us2.approvalRequiredProblem, {
          status: 423,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    const cart = cartReducer(createCart(), scanProduct(sugar));
    renderWithProviders(
      <PaymentPanel
        cart={cart}
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        tenantId={us1.TENANT_ID}
        isOnline
        onCartChange={() => undefined}
        onCompleted={vi.fn()}
        onProvisionalCompleted={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/cash amount/i), "25.00");
    await user.click(screen.getByRole("button", { name: /take split payment/i }));

    expect(
      await screen.findByRole("dialog", { name: /manager authorization/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/authorizing manager/i)).toBeVisible();
  });

  it("retries completion with the authorizing manager after a 423", async () => {
    const user = userEvent.setup();
    let posts = 0;
    let authorizedBy: string | undefined;
    server.use(
      http.post("*/api/v1/sales", async ({ request }) => {
        posts += 1;
        const body = (await request.json()) as {
          lines: { discountAuthorizedBy?: string }[];
        };
        authorizedBy = body.lines[0]?.discountAuthorizedBy;
        if (posts === 1) {
          return HttpResponse.json(us2.approvalRequiredProblem, {
            status: 423,
            headers: { "Content-Type": "application/problem+json" },
          });
        }
        return HttpResponse.json(us1.completedSale, { status: 201 });
      }),
    );

    const onCompleted = vi.fn();
    const cart = cartReducer(createCart(), scanProduct(sugar));
    renderWithProviders(
      <PaymentPanel
        cart={cart}
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        tenantId={us1.TENANT_ID}
        isOnline
        onCartChange={() => undefined}
        onCompleted={onCompleted}
        onProvisionalCompleted={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/cash amount/i), "25.00");
    await user.click(screen.getByRole("button", { name: /take split payment/i }));
    await screen.findByRole("dialog", { name: /manager authorization/i });
    await user.type(screen.getByLabelText(/authorizing manager/i), "manager@kwame.gh");
    await user.click(screen.getByRole("button", { name: /retry with authorization/i }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalled();
    });
    expect(authorizedBy).toBe("manager@kwame.gh");
  });

  it("blocks offline completion when the till is not PIN-unlocked for the shift", async () => {
    const user = userEvent.setup();
    const onProvisionalCompleted = vi.fn();
    const cart = cartReducer(createCart(), scanProduct(sugar));

    renderWithProviders(
      <PaymentPanel
        cart={cart}
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        tenantId={us1.TENANT_ID}
        isOnline={false}
        onCartChange={() => undefined}
        onCompleted={vi.fn()}
        onProvisionalCompleted={onProvisionalCompleted}
      />,
    );

    await user.type(screen.getByLabelText(/cash amount/i), "25.00");
    await user.click(screen.getByRole("button", { name: /complete offline sale/i }));

    expect(
      await screen.findByText(/unlock the till with your register pin/i),
    ).toBeVisible();
    expect(onProvisionalCompleted).not.toHaveBeenCalled();
  });
});

describe("held sale recall", () => {
  it("lists held sales and flags a stale price after recall", async () => {
    const user = userEvent.setup();
    const onRecall = vi.fn();
    server.use(...checkoutHandlers());

    renderWithProviders(
      <HeldSalesPanel
        products={[productSchema.parse(us1.productRecord)]}
        stockByProduct={new Map([[us1.PRODUCT_ID, "10"]])}
        onRecall={onRecall}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /recall held sale/i }));

    expect(await screen.findByText(/price has changed/i)).toBeVisible();
    expect(onRecall).toHaveBeenCalledWith(
      expect.objectContaining({ id: us2.HELD_SALE_ID }),
    );
  });

  it("completes a recalled held sale through the complete endpoint", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    let completedId: string | undefined;
    server.use(
      http.post(`*/api/v1/sales/${us2.HELD_SALE_ID}/complete`, async ({ request }) => {
        const body = (await request.json()) as { payments: unknown[] };
        completedId = us2.HELD_SALE_ID;
        expect(body.payments).toHaveLength(1);
        return HttpResponse.json(us1.completedSale);
      }),
    );

    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = {
      ...cart,
      heldSaleId: us2.HELD_SALE_ID,
      quote: saleSchema.parse(us2.heldSale),
    };

    renderWithProviders(
      <PaymentPanel
        cart={cart}
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        tenantId={us1.TENANT_ID}
        isOnline
        onCartChange={() => undefined}
        onCompleted={onCompleted}
        onProvisionalCompleted={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/cash amount/i), "25.00");
    await user.click(screen.getByRole("button", { name: /take split payment/i }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalled();
    });
    expect(completedId).toBe(us2.HELD_SALE_ID);
  });

  it("detects price, tax, availability, and inactive-status drift", () => {
    const drift = detectHeldSaleDrift({
      held: saleSchema.parse(us2.staleHeldSale),
      products: [productSchema.parse({ ...us1.productRecord, status: "Inactive" })],
      stockByProduct: new Map([[us1.PRODUCT_ID, "0"]]),
    });

    expect(drift.map((item) => item.kind).sort()).toEqual(
      ["active-status", "availability", "price"].sort(),
    );
  });

  it("flags a missing catalogue product and a changed tax treatment", () => {
    const missing = detectHeldSaleDrift({
      held: saleSchema.parse(us2.heldSale),
      products: [],
      stockByProduct: new Map(),
    });
    expect(missing[0]?.kind).toBe("active-status");
    expect(missing[0]?.detail).toMatch(/no longer in the catalogue/i);

    const taxed = detectHeldSaleDrift({
      held: saleSchema.parse({
        ...us2.heldSale,
        lines: [{ ...us2.heldSale.lines[0], taxComponents: "[]" }],
      }),
      products: [
        productSchema.parse({ ...us1.productRecord, taxTreatmentCode: "GH-ZERO" }),
      ],
      stockByProduct: new Map([[us1.PRODUCT_ID, "10"]]),
    });
    expect(taxed.some((item) => item.kind === "tax")).toBe(true);
  });
});
