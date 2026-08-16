import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import {
  applyReorderSuggestions,
  createSupplier,
  fetchPurchaseOrders,
  fetchSuppliers,
  recordGoodsReceipt,
  recordSupplierInvoice,
  allocateLandedCosts,
  submitPurchaseOrder,
  approvePurchaseOrder,
  closePurchaseOrderShort,
  createPurchaseOrder,
} from "../../src/features/purchasing/api/purchasing-api";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US7_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/suppliers"],
  ["post", "/api/v1/suppliers"],
  ["get", "/api/v1/suppliers/{id}/products"],
  ["put", "/api/v1/suppliers/{id}/products"],
  ["get", "/api/v1/suppliers/{id}/orders"],
  ["get", "/api/v1/suppliers/{id}/performance"],
  ["get", "/api/v1/reorder/suggestions"],
  ["post", "/api/v1/reorder/suggestions/apply"],
  ["get", "/api/v1/purchase-orders"],
  ["post", "/api/v1/purchase-orders"],
  ["patch", "/api/v1/purchase-orders/{id}"],
  ["post", "/api/v1/purchase-orders/{id}/submit"],
  ["post", "/api/v1/purchase-orders/{id}/approve"],
  ["post", "/api/v1/purchase-orders/{id}/reject"],
  ["post", "/api/v1/purchase-orders/{id}/cancel"],
  ["post", "/api/v1/purchase-orders/{id}/send"],
  ["get", "/api/v1/purchase-orders/{id}/pdf"],
  ["post", "/api/v1/purchase-orders/{id}/receipts"],
  ["post", "/api/v1/purchase-orders/{id}/close-short"],
  ["post", "/api/v1/supplier-invoices"],
  ["post", "/api/v1/goods-receipts/{id}/landed-costs"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

const SUPPLIER_ID = "44444444-4444-4444-8444-444444444401";
const LOCATION_ID = "33333333-3333-4333-8333-333333333333";
const PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
const ORDER_ID = "55555555-5555-4555-8555-555555555555";
const LINE_ID = "66666666-6666-4666-8666-666666666666";
const RECEIPT_ID = "77777777-7777-4777-8777-777777777777";

describe("US7 provider contract surface", () => {
  it("captures purchasing operations from InventoryX controllers", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US7_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });
});

describe("purchasing API contracts", () => {
  it("creates suppliers, applies reorder drafts, and pages purchase orders", async () => {
    server.use(
      http.get("*/api/v1/suppliers", () =>
        HttpResponse.json([{ id: SUPPLIER_ID, name: "Tema Wholesale" }]),
      ),
      http.post("*/api/v1/suppliers", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({ id: crypto.randomUUID(), name: body.name });
      }),
      http.post("*/api/v1/reorder/suggestions/apply", () =>
        HttpResponse.json([
          {
            id: ORDER_ID,
            supplierId: SUPPLIER_ID,
            deliverToLocationId: LOCATION_ID,
            status: "Draft",
            origin: "ReorderSuggestion",
            total: 120,
            lines: [
              {
                id: LINE_ID,
                productId: PRODUCT_ID,
                description: "Sugar",
                orderedQty: 20,
                receivedQty: 0,
                damagedQty: 0,
                unitCost: 6,
              },
            ],
          },
        ]),
      ),
      http.get("*/api/v1/purchase-orders", () =>
        HttpResponse.json({
          items: [
            {
              id: ORDER_ID,
              supplierId: SUPPLIER_ID,
              deliverToLocationId: LOCATION_ID,
              status: "Draft",
              origin: "Manual",
              total: 120,
              lines: [],
            },
          ],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    expect((await fetchSuppliers())[0]?.name).toBe("Tema Wholesale");
    expect((await createSupplier({ name: "Accra Foods" })).name).toBe("Accra Foods");
    expect(
      (
        await applyReorderSuggestions({
          deliverToLocationId: LOCATION_ID,
          selections: [
            {
              productId: PRODUCT_ID,
              supplierId: SUPPLIER_ID,
              qty: 20,
              unitCost: 6,
            },
          ],
        })
      )[0]?.status,
    ).toBe("Draft");
    expect((await fetchPurchaseOrders()).totalCount).toBe(1);
  });

  it("supports approval, partial receipt, close-short, invoice variance, and landed cost", async () => {
    let status = "Draft";
    server.use(
      http.post("*/api/v1/purchase-orders", () => {
        status = "Draft";
        return HttpResponse.json({
          id: ORDER_ID,
          supplierId: SUPPLIER_ID,
          deliverToLocationId: LOCATION_ID,
          status,
          origin: "Manual",
          total: 120,
          lines: [
            {
              id: LINE_ID,
              productId: PRODUCT_ID,
              description: "Sugar",
              orderedQty: 20,
              receivedQty: 0,
              damagedQty: 0,
              unitCost: 6,
            },
          ],
        });
      }),
      http.post("*/api/v1/purchase-orders/:id/submit", () => {
        status = "AwaitingApproval";
        return HttpResponse.json({
          id: ORDER_ID,
          supplierId: SUPPLIER_ID,
          deliverToLocationId: LOCATION_ID,
          status,
          origin: "Manual",
          total: 120,
          lines: [],
        });
      }),
      http.post("*/api/v1/purchase-orders/:id/approve", () => {
        status = "Sent";
        return HttpResponse.json({
          id: ORDER_ID,
          supplierId: SUPPLIER_ID,
          deliverToLocationId: LOCATION_ID,
          status,
          origin: "Manual",
          total: 120,
          lines: [],
        });
      }),
      http.post("*/api/v1/purchase-orders/:id/receipts", () => {
        status = "PartiallyReceived";
        return HttpResponse.json({
          id: RECEIPT_ID,
          receiptNumber: "GR-1",
          purchaseOrderId: ORDER_ID,
          locationId: LOCATION_ID,
          purchaseOrderStatus: status,
          lines: [],
        });
      }),
      http.post("*/api/v1/purchase-orders/:id/close-short", async ({ request }) => {
        const body = (await request.json()) as { reason?: string };
        expect(body.reason).toBeTruthy();
        status = "Closed";
        return HttpResponse.json({
          id: ORDER_ID,
          supplierId: SUPPLIER_ID,
          deliverToLocationId: LOCATION_ID,
          status,
          origin: "Manual",
          total: 120,
          lines: [],
        });
      }),
      http.post("*/api/v1/supplier-invoices", () =>
        HttpResponse.json({
          id: crypto.randomUUID(),
          invoiceNumber: "INV-9",
          hasPriceVariance: true,
          lines: [
            {
              productId: PRODUCT_ID,
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
              productId: PRODUCT_ID,
              allocatedAmount: 50,
              newUnitCost: 8.5,
            },
          ],
        }),
      ),
    );

    const created = await createPurchaseOrder({
      supplierId: SUPPLIER_ID,
      deliverToLocationId: LOCATION_ID,
      lines: [
        {
          productId: PRODUCT_ID,
          description: "Sugar",
          orderedQty: "20",
          unitCost: "6",
        },
      ],
    });
    expect((await submitPurchaseOrder(created.id)).status).toBe("AwaitingApproval");
    expect((await approvePurchaseOrder(created.id)).status).toBe("Sent");
    const receipt = await recordGoodsReceipt({
      purchaseOrderId: created.id,
      locationId: LOCATION_ID,
      lines: [
        {
          purchaseOrderLineId: LINE_ID,
          qtyReceived: 10,
          qtyDamaged: 1,
          unitCost: 6,
          batchNumber: "B1",
          expiresAt: "2027-01-01",
        },
      ],
    });
    expect(receipt.purchaseOrderStatus).toBe("PartiallyReceived");
    expect(
      (await closePurchaseOrderShort(created.id, "Supplier short-shipped")).status,
    ).toBe("Closed");
    expect(
      (
        await recordSupplierInvoice({
          supplierId: SUPPLIER_ID,
          purchaseOrderId: created.id,
          invoiceNumber: "INV-9",
          invoiceDate: new Date().toISOString(),
          lines: [{ productId: PRODUCT_ID, qty: 10, unitPrice: 6.5 }],
        })
      ).hasPriceVariance,
    ).toBe(true);
    expect(
      (
        await allocateLandedCosts({
          goodsReceiptId: receipt.id,
          costType: "Freight",
          totalAmount: 50,
        })
      ).lines[0]?.newUnitCost,
    ).toBe("8.5");
  });
});
