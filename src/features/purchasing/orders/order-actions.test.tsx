import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { OrderActions } from "./order-actions";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import type { PurchaseOrderRecord } from "../api/purchasing-api";

const order: PurchaseOrderRecord = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  supplierId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  deliverToLocationId: "55555555-5555-4555-8555-555555555555",
  status: "Draft",
  origin: "Manual",
  originReferenceId: null,
  requiredBy: null,
  notes: null,
  total: "120.00",
  lines: [],
};

describe("order actions", () => {
  it("runs submit/approve/reject/send/cancel flows", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.post("*/api/v1/purchase-orders/:id/submit", () =>
        HttpResponse.json({ ...order, status: "AwaitingApproval" }),
      ),
      http.post("*/api/v1/purchase-orders/:id/approve", () =>
        HttpResponse.json({ ...order, status: "Approved" }),
      ),
      http.post("*/api/v1/purchase-orders/:id/reject", () =>
        HttpResponse.json({ ...order, status: "Rejected" }),
      ),
      http.post("*/api/v1/purchase-orders/:id/send", () =>
        HttpResponse.json({ sent: true }),
      ),
      http.post("*/api/v1/purchase-orders/:id/cancel", () =>
        HttpResponse.json({ ...order, status: "Cancelled" }),
      ),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OrderActions order={order} onChanged={onChanged} />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    await user.click(screen.getByRole("button", { name: /^approve$/i }));
    await user.click(screen.getByRole("button", { name: /^reject$/i }));
    await user.click(screen.getByRole("button", { name: /send \/ email supplier/i }));
    await user.type(screen.getByLabelText(/cancel reason/i), "no longer needed");
    await user.click(screen.getByRole("button", { name: /cancel order/i }));
    await vi.waitFor(() => {
      expect(onChanged).toHaveBeenCalled();
    });
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
  });
});
