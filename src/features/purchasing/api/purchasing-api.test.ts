import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import {
  applyReorderSuggestions,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrderShort,
  createPurchaseOrder,
  fetchPurchaseOrders,
  fetchSupplierOrders,
  fetchSupplierPerformance,
  fetchSupplierProducts,
  patchPurchaseOrder,
  purchaseOrderPdfUrl,
  putSupplierProducts,
  recordGoodsReceipt,
  rejectPurchaseOrder,
  sendPurchaseOrder,
  submitPurchaseOrder,
  recordSupplierInvoice,
  allocateLandedCosts,
  type PurchaseOrderRecord,
} from "./purchasing-api";

const supplierId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const locationId = "55555555-5555-4555-8555-555555555555";
const productId = "44444444-4444-4444-8444-444444444444";
const orderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const lineId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const sampleOrder = (status = "Draft"): PurchaseOrderRecord => ({
  id: orderId,
  supplierId,
  deliverToLocationId: locationId,
  status,
  origin: "Manual",
  originReferenceId: null,
  requiredBy: null,
  notes: null,
  total: "120.00",
  lines: [
    {
      id: lineId,
      productId,
      variantId: null,
      description: "Sugar",
      orderedQty: "20",
      receivedQty: "0",
      damagedQty: "0",
      unitCost: "6.00",
    },
  ],
});

describe("purchasing api helpers", () => {
  it("covers supplier, order lifecycle, and receipt endpoints", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get(`*/api/v1/suppliers/${supplierId}/products`, () =>
        HttpResponse.json([{ productId, supplierCode: "TW", lastPrice: 6 }]),
      ),
      http.get(`*/api/v1/suppliers/${supplierId}/orders`, () =>
        HttpResponse.json([sampleOrder("Sent")]),
      ),
      http.get(`*/api/v1/suppliers/${supplierId}/performance`, () =>
        HttpResponse.json({
          onTimeRate: 0.9,
          fillRate: 0.95,
          averageLeadTimeDays: 3,
          extra: "ignored",
        }),
      ),
      http.put(`*/api/v1/suppliers/${supplierId}/products`, () =>
        HttpResponse.json({ ok: true }),
      ),
      http.get("*/api/v1/purchase-orders", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("status")).toBe("Draft");
        expect(url.searchParams.get("overdue")).toBe("true");
        return HttpResponse.json({
          items: [sampleOrder()],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        });
      }),
      http.post("*/api/v1/purchase-orders", () =>
        HttpResponse.json(sampleOrder(), { status: 201 }),
      ),
      http.patch(`*/api/v1/purchase-orders/${orderId}`, () =>
        HttpResponse.json(
          { ...sampleOrder(), notes: "rush" },
          {
            headers: { ETag: '"v2"' },
          },
        ),
      ),
      http.post(`*/api/v1/purchase-orders/${orderId}/submit`, () =>
        HttpResponse.json(sampleOrder("AwaitingApproval")),
      ),
      http.post(`*/api/v1/purchase-orders/${orderId}/approve`, () =>
        HttpResponse.json(sampleOrder("Approved")),
      ),
      http.post(`*/api/v1/purchase-orders/${orderId}/reject`, () =>
        HttpResponse.json(sampleOrder("Rejected")),
      ),
      http.post(`*/api/v1/purchase-orders/${orderId}/cancel`, () =>
        HttpResponse.json(sampleOrder("Cancelled")),
      ),
      http.post(`*/api/v1/purchase-orders/${orderId}/close-short`, () =>
        HttpResponse.json(sampleOrder("ClosedShort")),
      ),
      http.post(`*/api/v1/purchase-orders/${orderId}/send`, () =>
        HttpResponse.json({}),
      ),
      http.post(`*/api/v1/purchase-orders/${orderId}/receipts`, () =>
        HttpResponse.json({
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          receiptNumber: "GR-1",
          purchaseOrderId: orderId,
          locationId,
          purchaseOrderStatus: "PartiallyReceived",
          lines: [],
        }),
      ),
      http.post("*/api/v1/reorder/suggestions/apply", () =>
        HttpResponse.json([sampleOrder("Draft")]),
      ),
      http.post("*/api/v1/supplier-invoices", () =>
        HttpResponse.json({
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          invoiceNumber: "SI-1",
          hasPriceVariance: true,
          lines: [
            {
              productId,
              unitPrice: "6.50",
              orderedUnitCost: "6.00",
              hasVariance: true,
            },
          ],
        }),
      ),
      http.post("*/api/v1/goods-receipts/:id/landed-costs", () =>
        HttpResponse.json({
          goodsReceiptId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          lines: [
            {
              goodsReceiptLineId: lineId,
              productId,
              allocatedAmount: "2.00",
              newUnitCost: "6.10",
            },
          ],
        }),
      ),
    );

    await expect(fetchSupplierProducts(supplierId)).resolves.toEqual([
      { productId, supplierCode: "TW", lastPrice: "6" },
    ]);
    await expect(fetchSupplierOrders(supplierId)).resolves.toHaveLength(1);
    await expect(fetchSupplierPerformance(supplierId)).resolves.toMatchObject({
      onTimeRate: 0.9,
    });
    await putSupplierProducts(supplierId, [
      { productId, supplierCode: "TW", price: 6 },
    ]);
    await expect(
      fetchPurchaseOrders({ status: "Draft", overdue: true, page: 1, pageSize: 50 }),
    ).resolves.toMatchObject({ totalCount: 1 });
    await expect(
      createPurchaseOrder({
        supplierId,
        deliverToLocationId: locationId,
        lines: [
          {
            productId,
            description: "Sugar",
            orderedQty: "20",
            unitCost: "6",
          },
        ],
      }),
    ).resolves.toMatchObject({ id: orderId });
    await expect(
      patchPurchaseOrder(orderId, { notes: "rush" }, '"v1"'),
    ).resolves.toMatchObject({
      notes: "rush",
      etag: '"v2"',
    });
    await expect(submitPurchaseOrder(orderId)).resolves.toMatchObject({
      status: "AwaitingApproval",
    });
    await expect(approvePurchaseOrder(orderId)).resolves.toMatchObject({
      status: "Approved",
    });
    await expect(rejectPurchaseOrder(orderId)).resolves.toMatchObject({
      status: "Rejected",
    });
    await expect(cancelPurchaseOrder(orderId, "changed mind")).resolves.toMatchObject({
      status: "Cancelled",
    });
    await expect(
      closePurchaseOrderShort(orderId, "supplier short"),
    ).resolves.toMatchObject({
      status: "ClosedShort",
    });
    await expect(sendPurchaseOrder(orderId)).resolves.toEqual({ sent: true });
    await expect(
      recordGoodsReceipt({
        purchaseOrderId: orderId,
        locationId,
        lines: [
          {
            purchaseOrderLineId: lineId,
            qtyReceived: 10,
            qtyDamaged: 0,
            unitCost: 6,
          },
        ],
      }),
    ).resolves.toMatchObject({ receiptNumber: "GR-1" });
    await expect(
      applyReorderSuggestions({
        deliverToLocationId: locationId,
        selections: [{ productId, supplierId, qty: 10, unitCost: 6 }],
      }),
    ).resolves.toHaveLength(1);
    await expect(
      recordSupplierInvoice({
        supplierId,
        purchaseOrderId: orderId,
        invoiceNumber: "SI-1",
        invoiceDate: "2026-08-01",
        lines: [{ productId, qty: 10, unitPrice: 6.5 }],
      }),
    ).resolves.toMatchObject({ hasPriceVariance: true });
    await expect(
      allocateLandedCosts({
        goodsReceiptId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        costType: "Freight",
        totalAmount: 2,
      }),
    ).resolves.toMatchObject({
      goodsReceiptId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    });
    expect(purchaseOrderPdfUrl(orderId)).toContain(`/purchase-orders/${orderId}/pdf`);
  });

  it("surfaces conflict and approval failures", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.patch(
        `*/api/v1/purchase-orders/${orderId}`,
        () => new HttpResponse(null, { status: 412 }),
      ),
      http.post(
        `*/api/v1/purchase-orders/${orderId}/submit`,
        () => new HttpResponse(null, { status: 423 }),
      ),
      http.get(
        "*/api/v1/suppliers/x/products",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(
        "*/api/v1/suppliers/x/orders",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(
        "*/api/v1/suppliers/x/performance",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.put(
        "*/api/v1/suppliers/x/products",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.get(
        "*/api/v1/purchase-orders",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(
        "*/api/v1/purchase-orders",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(
        "*/api/v1/purchase-orders/x/send",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(
        "*/api/v1/purchase-orders/x/receipts",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(
        "*/api/v1/reorder/suggestions/apply",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(
        "*/api/v1/supplier-invoices",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(
        "*/api/v1/goods-receipts/x/landed-costs",
        () => new HttpResponse(null, { status: 500 }),
      ),
      http.post(
        "*/api/v1/purchase-orders/x/cancel",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    await expect(patchPurchaseOrder(orderId, { notes: "x" })).rejects.toThrow(/412/);
    await expect(submitPurchaseOrder(orderId)).rejects.toThrow(/423/);
    await expect(fetchSupplierProducts("x")).rejects.toThrow(/Failed/);
    await expect(fetchSupplierOrders("x")).rejects.toThrow(/Failed/);
    await expect(fetchSupplierPerformance("x")).rejects.toThrow(/Failed/);
    await expect(putSupplierProducts("x", [])).rejects.toThrow(/Failed/);
    await expect(fetchPurchaseOrders()).rejects.toThrow(/Failed/);
    await expect(
      createPurchaseOrder({
        supplierId,
        deliverToLocationId: locationId,
        lines: [{ productId, description: "Sugar", orderedQty: "1", unitCost: "1" }],
      }),
    ).rejects.toThrow(/Failed/);
    await expect(sendPurchaseOrder("x")).rejects.toThrow(/Failed/);
    await expect(
      recordGoodsReceipt({
        purchaseOrderId: "x",
        locationId,
        lines: [
          {
            purchaseOrderLineId: lineId,
            qtyReceived: 1,
            qtyDamaged: 0,
            unitCost: 1,
          },
        ],
      }),
    ).rejects.toThrow(/Failed/);
    await expect(
      applyReorderSuggestions({ deliverToLocationId: locationId, selections: [] }),
    ).rejects.toThrow(/Failed/);
    await expect(
      recordSupplierInvoice({
        supplierId,
        invoiceNumber: "SI",
        invoiceDate: "2026-08-01",
        lines: [],
      }),
    ).rejects.toThrow(/Failed/);
    await expect(
      allocateLandedCosts({
        goodsReceiptId: "x",
        costType: "Duty",
        totalAmount: 1,
      }),
    ).rejects.toThrow(/Failed/);
    await expect(cancelPurchaseOrder("x", "n")).rejects.toThrow(/failed/i);
  });
});
