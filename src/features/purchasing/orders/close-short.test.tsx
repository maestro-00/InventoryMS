import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { CloseShortForm } from "./close-short";
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
  lines: [],
};

describe("close short form", () => {
  it("hides for closed orders and closes short with a reason", async () => {
    const user = userEvent.setup();
    const onClosed = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.post("*/api/v1/purchase-orders/:id/close-short", () =>
        HttpResponse.json({ ...order, status: "ClosedShort" }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <CloseShortForm order={{ ...order, status: "Draft" }} onClosed={onClosed} />
      </QueryClientProvider>,
    );
    expect(screen.queryByLabelText(/close-short reason/i)).not.toBeInTheDocument();

    rerender(
      <QueryClientProvider client={client}>
        <CloseShortForm order={order} onClosed={onClosed} />
      </QueryClientProvider>,
    );
    await user.type(screen.getByLabelText(/close-short reason/i), "supplier short");
    await user.click(screen.getByRole("button", { name: /close short/i }));
    await vi.waitFor(() => {
      expect(onClosed.mock.calls[0]?.[0]).toMatchObject({ status: "ClosedShort" });
    });
    confirm.mockRestore();
  });
});
