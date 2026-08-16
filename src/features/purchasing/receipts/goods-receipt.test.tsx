import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { GoodsReceiptForm } from "./goods-receipt";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import type { PurchaseOrderRecord } from "../api/purchasing-api";

const order: PurchaseOrderRecord = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  supplierId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  deliverToLocationId: "55555555-5555-4555-8555-555555555555",
  status: "Sent",
  origin: "Manual",
  originReferenceId: null,
  requiredBy: null,
  notes: null,
  total: "120.00",
  lines: [
    {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      productId: "44444444-4444-4444-8444-444444444444",
      variantId: null,
      description: "Sugar",
      orderedQty: "20",
      receivedQty: "0",
      damagedQty: "0",
      unitCost: "6.00",
    },
  ],
};

describe("goods receipt form", () => {
  it("records a batched receipt with expiry", async () => {
    const user = userEvent.setup();
    const onReceived = vi.fn();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.post("*/api/v1/purchase-orders/:id/receipts", async ({ request }) => {
        const body = (await request.json()) as {
          lines: Array<{ batchNumber?: string; expiresAt?: string }>;
        };
        expect(body.lines[0]?.batchNumber).toBe("BATCH-9");
        expect(body.lines[0]?.expiresAt).toBe("2027-01-01");
        return HttpResponse.json({
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          receiptNumber: "GR-9",
          purchaseOrderId: order.id,
          locationId: order.deliverToLocationId,
          purchaseOrderStatus: "PartiallyReceived",
          lines: [],
        });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <GoodsReceiptForm
          order={order}
          locationId={order.deliverToLocationId}
          onReceived={onReceived}
        />
      </QueryClientProvider>,
    );
    await user.type(screen.getByLabelText(/batch number/i), "BATCH-9");
    await user.type(screen.getByLabelText(/expiry/i), "2027-01-01");
    await user.click(screen.getByRole("button", { name: /record receipt/i }));
    await vi.waitFor(() => {
      expect(onReceived).toHaveBeenCalledWith("dddddddd-dddd-4ddd-8ddd-dddddddddddd");
    });
  });

  it("renders empty state when the order has no lines", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <GoodsReceiptForm
          order={{ ...order, lines: [] }}
          locationId={order.deliverToLocationId}
          requireExpiry={false}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/select an order with lines/i)).toBeInTheDocument();
  });
});
