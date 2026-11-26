import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
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
  it("submits a card payment without requiring cash", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    let payments: Array<{ tender: string; amount: number }> = [];
    server.use(
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as {
          payments: Array<{ tender: string; amount: number }>;
        };
        payments = body.payments;
        return HttpResponse.json(us2.splitCompletedSale, { status: 201 });
      }),
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
        onCompleted={onCompleted}
        onProvisionalCompleted={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add card tender" }));
    await user.type(screen.getByLabelText("Card amount"), "25.00");
    await user.type(screen.getByLabelText(/card reference/i), "AUTH-25");
    await user.click(screen.getByRole("button", { name: "Take split payment" }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledOnce();
    });
    expect(payments).toEqual([{ tender: "Card", amount: 25, reference: "AUTH-25" }]);
  });

  it("requires references for noncash tenders with amounts", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    let posts = 0;
    server.use(
      http.post("*/api/v1/sales", () => {
        posts += 1;
        return HttpResponse.json(us2.splitCompletedSale, { status: 201 });
      }),
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
        onCompleted={onCompleted}
        onProvisionalCompleted={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add card tender" }));
    await user.type(screen.getByLabelText("Card amount"), "10.00");
    await user.click(screen.getByRole("button", { name: "Add MobileMoney tender" }));
    await user.type(screen.getByLabelText("MobileMoney amount"), "15.00");
    await user.click(screen.getByRole("button", { name: "Take split payment" }));

    expect(screen.getByLabelText(/card reference/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/MobileMoney reference/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(posts).toBe(0);

    await user.type(screen.getByLabelText(/card reference/i), "AUTH-10");
    await user.type(screen.getByLabelText(/MobileMoney reference/i), "MOMO-15");
    await user.click(screen.getByRole("button", { name: "Take split payment" }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalledOnce();
    });
    expect(posts).toBe(1);
  });

  it("shows each extra tender once and removes its add option", async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole("button", { name: "Add MobileMoney tender" }));
    const mobileMoney = screen.getByRole("group", { name: "MobileMoney tender" });
    expect(within(mobileMoney).getByLabelText("MobileMoney amount")).toBeVisible();
    expect(within(mobileMoney).getByLabelText("MobileMoney reference")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add MobileMoney tender" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add BankTransfer tender" }),
    ).toBeVisible();
  });

  it("shows payment progress before grouped fields and add buttons above checkout", async () => {
    const user = userEvent.setup();
    const cart = cartReducer(createCart(), scanProduct(sugar));

    renderWithProviders(
      <PaymentPanel
        cart={cart}
        previewTotal="10.00"
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        tenantId={us1.TENANT_ID}
        isOnline
        onCartChange={() => undefined}
        onCompleted={vi.fn()}
        onProvisionalCompleted={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add card tender" }));
    await user.click(screen.getByRole("button", { name: "Add MobileMoney tender" }));
    await user.type(screen.getByLabelText("Card amount"), "2");

    const panel = screen.getByRole("region", { name: "Split payment" });
    const card = within(panel).getByRole("group", { name: "Card tender" });
    const mobileMoney = within(panel).getByRole("group", {
      name: "MobileMoney tender",
    });
    const children = Array.from(panel.children);
    const position = (element: Element) => children.indexOf(element);

    expect(within(card).getByLabelText("Card amount")).toBeVisible();
    expect(within(card).getByLabelText(/Card reference/i)).toBeVisible();
    expect(within(mobileMoney).getByLabelText("MobileMoney amount")).toBeVisible();
    expect(within(mobileMoney).getByLabelText(/MobileMoney reference/i)).toBeVisible();
    expect(position(within(panel).getByText(/Still to pay:/i))).toBeLessThan(
      position(card),
    );
    expect(position(card)).toBeLessThan(position(mobileMoney));
    expect(position(mobileMoney)).toBeLessThan(
      position(within(panel).getByRole("button", { name: "Add Cheque tender" })),
    );
    expect(
      position(within(panel).getByRole("button", { name: "Add Cheque tender" })),
    ).toBeLessThan(
      position(within(panel).getByRole("button", { name: "Take split payment" })),
    );
  });

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

    const heldLine = us2.heldSale.lines[0];
    if (!heldLine) throw new Error("Expected held sale line");
    let cart = cartReducer(createCart(), scanProduct(sugar));
    cart = {
      ...cart,
      heldSaleId: us2.HELD_SALE_ID,
      quote: saleSchema.parse(us2.heldSale),
      lines: cart.lines.map((line) => ({
        ...line,
        heldLineId: heldLine.id,
      })),
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

    await user.type(screen.getByLabelText(/cash amount/i), "10.00");
    await user.click(screen.getByRole("button", { name: /take split payment/i }));
    expect(
      screen.getByText(/payments do not cover the held sale total/i),
    ).toBeVisible();
    expect(completedId).toBeUndefined();
    await user.clear(screen.getByLabelText(/cash amount/i));
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
