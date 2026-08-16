import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { PurchaseOrderWorkspace } from "./purchase-order-list";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";

const supplierId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const locationId = "55555555-5555-4555-8555-555555555555";
const productId = "44444444-4444-4444-8444-444444444444";
const orderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("purchase order workspace", () => {
  it("creates a draft order from the form defaults", async () => {
    const user = userEvent.setup();
    const onSelectOrder = vi.fn();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/purchase-orders", () =>
        HttpResponse.json({ items: [], page: 1, pageSize: 50, totalCount: 0 }),
      ),
      http.post("*/api/v1/purchase-orders", async ({ request }) => {
        const body = (await request.json()) as {
          supplierId: string;
          deliverToLocationId: string;
          lines: Array<{ productId: string }>;
        };
        expect(body.supplierId).toBe(supplierId);
        expect(body.deliverToLocationId).toBe(locationId);
        expect(body.lines[0]?.productId).toBe(productId);
        return HttpResponse.json(
          {
            id: orderId,
            supplierId,
            deliverToLocationId: locationId,
            status: "Draft",
            origin: "Manual",
            total: "120.00",
            lines: [
              {
                id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
                productId,
                description: "Sugar",
                orderedQty: "20",
                receivedQty: "0",
                damagedQty: "0",
                unitCost: "6.00",
              },
            ],
          },
          { status: 201 },
        );
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PurchaseOrderWorkspace
          suppliers={[{ id: supplierId, name: "Tema" }]}
          locations={[{ id: locationId, name: "Makola" }]}
          products={[{ id: productId, name: "Sugar" }]}
          onSelectOrder={onSelectOrder}
        />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: /create draft order/i }));
    await vi.waitFor(() => {
      expect(onSelectOrder).toHaveBeenCalledWith(
        expect.objectContaining({ id: orderId, status: "Draft" }),
      );
    });
  });

  it("selects an existing order and exposes lifecycle helpers", async () => {
    const user = userEvent.setup();
    const onSelectOrder = vi.fn();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    const listed = {
      id: orderId,
      supplierId,
      deliverToLocationId: locationId,
      status: "Sent",
      origin: "Manual",
      originReferenceId: null,
      requiredBy: null,
      notes: null,
      total: "120.00",
      lines: [
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          productId,
          variantId: null,
          description: "Sugar",
          orderedQty: "20",
          receivedQty: "0",
          damagedQty: "0",
          unitCost: "6.00",
        },
      ],
    };
    server.use(
      http.get("*/api/v1/purchase-orders", () =>
        HttpResponse.json({ items: [listed], page: 1, pageSize: 50, totalCount: 1 }),
      ),
      http.get(`*/api/v1/purchase-orders/${orderId}/document`, () =>
        HttpResponse.json({
          orderId,
          html: "<p>PO</p>",
          pdfUrl: null,
        }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PurchaseOrderWorkspace
          suppliers={[{ id: supplierId, name: "Tema" }]}
          locations={[{ id: locationId, name: "Makola" }]}
          products={[{ id: productId, name: "Sugar" }]}
          onSelectOrder={onSelectOrder}
        />
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole("button", { name: orderId.slice(0, 8) }));
    expect(onSelectOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: orderId }),
    );
    expect(screen.getByLabelText(/selected purchase order/i)).toBeInTheDocument();
  });
});

describe("runOrderAction", () => {
  it("routes each action to the matching API helper", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    const draft = {
      id: orderId,
      supplierId,
      deliverToLocationId: locationId,
      status: "Draft",
      origin: "Manual",
      originReferenceId: null,
      requiredBy: null,
      notes: null,
      total: "10.00",
      lines: [],
    };
    server.use(
      http.post("*/api/v1/purchase-orders/:id/submit", () =>
        HttpResponse.json({ ...draft, status: "AwaitingApproval" }),
      ),
      http.post("*/api/v1/purchase-orders/:id/approve", () =>
        HttpResponse.json({ ...draft, status: "Approved" }),
      ),
      http.post("*/api/v1/purchase-orders/:id/reject", () =>
        HttpResponse.json({ ...draft, status: "Rejected" }),
      ),
      http.post("*/api/v1/purchase-orders/:id/cancel", async ({ request }) => {
        const body = (await request.json()) as { reason?: string };
        expect(body.reason).toBe("buyer cancel");
        return HttpResponse.json({ ...draft, status: "Cancelled" });
      }),
    );
    const { runOrderAction } = await import("./purchase-order-list");
    await expect(runOrderAction(draft as never, "submit")).resolves.toMatchObject({
      status: "AwaitingApproval",
    });
    await expect(runOrderAction(draft as never, "approve")).resolves.toMatchObject({
      status: "Approved",
    });
    await expect(runOrderAction(draft as never, "reject")).resolves.toMatchObject({
      status: "Rejected",
    });
    await expect(
      runOrderAction(draft as never, "cancel", "buyer cancel"),
    ).resolves.toMatchObject({ status: "Cancelled" });
  });
});
