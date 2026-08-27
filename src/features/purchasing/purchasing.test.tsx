import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithProviders } from "../../shared/test/render";
import * as us1 from "../../../tests/fixtures/provider/us1";
import { PurchasingPage } from "../../routes/_authenticated/purchasing/index";
import { SupplierMaintenance } from "./suppliers/supplier-list";
import { PurchaseOrderWorkspace } from "./orders/purchase-order-list";
import { GoodsReceiptForm } from "./receipts/goods-receipt";
import { SupplierInvoiceForm } from "./invoices/supplier-invoice-form";
import { LandedCostForm } from "./landed-costs/landed-cost-form";
import { CreateOrdersFromReorder } from "./reorder/create-orders";
import type { PurchaseOrderRecord } from "./api/purchasing-api";

const SUPPLIER_ID = "44444444-4444-4444-8444-444444444401";
const ORDER_ID = "55555555-5555-4555-8555-555555555555";
const LINE_ID = "66666666-6666-4666-8666-666666666666";
const RECEIPT_ID = "77777777-7777-4777-8777-777777777777";

const draftOrder = (): PurchaseOrderRecord => ({
  id: ORDER_ID,
  supplierId: SUPPLIER_ID,
  deliverToLocationId: us1.LOCATION_ID,
  status: "Draft",
  origin: "Manual",
  originReferenceId: null,
  requiredBy: null,
  notes: null,
  total: "120.00",
  lines: [
    {
      id: LINE_ID,
      productId: us1.PRODUCT_ID,
      variantId: null,
      description: "Sugar 1kg",
      orderedQty: "20",
      receivedQty: "0",
      damagedQty: "0",
      unitCost: "6.00",
    },
  ],
});

describe("purchasing page tabs", () => {
  it("exposes suppliers, orders, receive, and costs tabs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchasingPage />);

    expect(
      await screen.findByRole("heading", { name: /^purchasing$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^suppliers$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^orders$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^receive$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^costs$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^receive$/i }));
    expect(
      await screen.findByText(/select a purchase order from the orders tab/i),
    ).toBeInTheDocument();
  });
});

describe("purchasing suppliers", () => {
  it("creates a supplier and shows performance/history when selected", async () => {
    const user = userEvent.setup();
    const suppliers = [
      { id: SUPPLIER_ID, name: "Tema Wholesale", email: null, phone: null },
    ];
    server.use(
      http.get("*/api/v1/suppliers", () => HttpResponse.json(suppliers)),
      http.post("*/api/v1/suppliers", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        const created = {
          id: crypto.randomUUID(),
          name: body.name,
          email: null,
          phone: null,
        };
        suppliers.push(created);
        return HttpResponse.json(created, { status: 201 });
      }),
      http.get("*/api/v1/suppliers/:id/products", () =>
        HttpResponse.json([
          { productId: us1.PRODUCT_ID, supplierCode: "TW-SUG", lastPrice: 6 },
        ]),
      ),
      http.get("*/api/v1/suppliers/:id/orders", () => HttpResponse.json([])),
      http.get("*/api/v1/suppliers/:id/performance", () =>
        HttpResponse.json({ onTimeRate: 0.92, fillRate: 0.97, averageLeadTimeDays: 3 }),
      ),
      http.put(
        "*/api/v1/suppliers/:id/products",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    renderWithProviders(<SupplierMaintenance />);
    await user.type(await screen.findByLabelText(/supplier name/i), "Accra Foods");
    await user.click(screen.getByRole("button", { name: /save supplier/i }));
    expect(
      await screen.findByRole("button", { name: /accra foods/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tema wholesale/i }));
    expect(await screen.findByText(/on-time 0.92/i)).toBeInTheDocument();
    expect(screen.getByText(/tw-sug/i)).toBeInTheDocument();
  });
});

describe("purchasing orders and receipts", () => {
  it("creates a draft, submits for send, and records a partial receipt with batch lines", async () => {
    const user = userEvent.setup();
    let status = "Draft";
    let order = draftOrder();
    server.use(
      http.get("*/api/v1/purchase-orders", () =>
        HttpResponse.json({
          items: [{ ...order, status }],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post("*/api/v1/purchase-orders", () => {
        status = "Draft";
        order = draftOrder();
        return HttpResponse.json(order, { status: 201 });
      }),
      http.post("*/api/v1/purchase-orders/:id/submit", () => {
        status = "Sent";
        order = { ...order, status };
        return HttpResponse.json(order);
      }),
      http.post("*/api/v1/purchase-orders/:id/receipts", async ({ request }) => {
        const body = (await request.json()) as {
          lines: Array<{ qtyReceived: number; batchNumber?: string }>;
        };
        expect(body.lines[0]?.batchNumber).toBe("BATCH-1");
        status = "PartiallyReceived";
        const firstLine = order.lines[0];
        if (!firstLine) throw new Error("expected purchase order line");
        order = {
          ...order,
          status,
          lines: [
            {
              ...firstLine,
              receivedQty: "10",
              damagedQty: "1",
            },
          ],
        };
        return HttpResponse.json({
          id: RECEIPT_ID,
          receiptNumber: "GR-1",
          purchaseOrderId: ORDER_ID,
          locationId: us1.LOCATION_ID,
          purchaseOrderStatus: status,
          lines: [],
        });
      }),
    );

    renderWithProviders(
      <PurchaseOrderWorkspace
        suppliers={[{ id: SUPPLIER_ID, name: "Tema Wholesale" }]}
        locations={[{ id: us1.LOCATION_ID, name: "Main Shop" }]}
        products={[{ id: us1.PRODUCT_ID, name: "Sugar 1kg" }]}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: /create draft order/i }),
    );
    expect(await screen.findByText(/current status: draft/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    await waitFor(() => {
      expect(screen.getByText(/current status: sent/i)).toBeInTheDocument();
    });

    renderWithProviders(
      <GoodsReceiptForm
        order={{ ...order, status: "Sent" }}
        locationId={us1.LOCATION_ID}
      />,
    );
    await user.clear(screen.getByLabelText(/quantity received/i));
    await user.type(screen.getByLabelText(/quantity received/i), "10");
    await user.clear(screen.getByLabelText(/quantity damaged/i));
    await user.type(screen.getByLabelText(/quantity damaged/i), "1");
    await user.type(screen.getByLabelText(/batch number/i), "BATCH-1");
    await user.type(screen.getByLabelText(/expiry date/i), "2027-01-01");
    await user.click(screen.getByRole("button", { name: /record receipt/i }));
    expect(await screen.findByText(/receipt gr-1/i)).toBeInTheDocument();
    expect(screen.getByText(/partiallyreceived/i)).toBeInTheDocument();
  });

  it("flags invoice price variance and shows true cost after landed allocation", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/supplier-invoices", () =>
        HttpResponse.json({
          id: crypto.randomUUID(),
          invoiceNumber: "INV-9",
          hasPriceVariance: true,
          lines: [
            {
              productId: us1.PRODUCT_ID,
              unitPrice: 6.5,
              orderedUnitCost: 6,
              hasVariance: true,
            },
          ],
        }),
      ),
      http.post("*/api/v1/goods-receipts/:id/landed-costs", () =>
        HttpResponse.json({
          goodsReceiptId: RECEIPT_ID,
          lines: [
            {
              goodsReceiptLineId: crypto.randomUUID(),
              productId: us1.PRODUCT_ID,
              allocatedAmount: 50,
              newUnitCost: 8.5,
            },
          ],
        }),
      ),
    );

    renderWithProviders(
      <>
        <SupplierInvoiceForm
          supplierId={SUPPLIER_ID}
          purchaseOrderId={ORDER_ID}
          productId={us1.PRODUCT_ID}
          orderedUnitCost="6.00"
        />
        <LandedCostForm goodsReceiptId={RECEIPT_ID} />
      </>,
    );

    await user.type(screen.getByLabelText(/invoice number/i), "INV-9");
    await user.clear(screen.getByLabelText(/invoice unit price/i));
    await user.type(screen.getByLabelText(/invoice unit price/i), "6.5");
    await user.click(screen.getByRole("button", { name: /record invoice/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/price difference/i);

    await user.click(screen.getByRole("button", { name: /^allocate$/i }));
    expect(
      await screen.findByText(/new true cost on first line: 8\.5/i),
    ).toBeInTheDocument();
  });

  it("applies selected reorder suggestions into draft purchase orders", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v1/reorder/suggestions", () =>
        HttpResponse.json({
          items: [
            {
              productId: us1.PRODUCT_ID,
              productName: "Sugar 1kg",
              sku: "SUG-001",
              supplierId: SUPPLIER_ID,
              supplierName: "Tema Wholesale",
              currentStock: 2,
              reorderPoint: 5,
              suggestedQty: 20,
              leadTimeDays: 3,
              unitCost: 6,
            },
          ],
        }),
      ),
      http.post("*/api/v1/reorder/suggestions/apply", async ({ request }) => {
        const body = (await request.json()) as {
          selections: Array<{ productId: string }>;
        };
        expect(body.selections).toHaveLength(1);
        return HttpResponse.json([draftOrder()]);
      }),
    );

    renderWithProviders(
      <CreateOrdersFromReorder
        locations={[{ id: us1.LOCATION_ID, name: "Main Shop" }]}
      />,
    );
    const suggestion = await screen.findByText(/sugar 1kg via tema wholesale/i);
    const row = suggestion.closest("li");
    expect(row).toBeTruthy();
    await user.click(within(row as HTMLElement).getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create draft orders/i }));
    expect(await screen.findByText(/1 draft purchase order/i)).toBeInTheDocument();
  });
});
