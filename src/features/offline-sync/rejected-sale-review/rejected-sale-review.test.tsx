import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { RejectedSaleReview } from "./rejected-sale-review";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";

describe("rejected sale review", () => {
  it("blocks cashiers without manage rights", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RejectedSaleReview canManage={false} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(/only a manager/i)).toBeInTheDocument();
  });

  it("lists rejected sales and releases them for retry", async () => {
    const user = userEvent.setup();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    let resolved = false;
    server.use(
      http.get("*/api/v1/sync/rejected", () =>
        HttpResponse.json([
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            clientSaleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            registerId: "22222222-2222-4222-8222-222222222222",
            rejectionReason: "product missing",
            traceId: "trace-1",
            status: "Rejected",
            payloadHash: "abc",
          },
        ]),
      ),
      http.post("*/api/v1/sync/rejected/:id/resolve", () => {
        resolved = true;
        return HttpResponse.json({ ok: true });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <RejectedSaleReview canManage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/product missing/i)).toBeInTheDocument();
    expect(screen.getByText(/Support ref: trace-1/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /release for retry/i }));
    await vi.waitFor(() => {
      expect(resolved).toBe(true);
    });
  });
});
