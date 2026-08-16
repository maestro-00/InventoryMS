import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { StockConflictReview } from "./stock-conflict-review";

describe("stock conflict review", () => {
  it("offers acceptAsIs and adjustWithReason actions", async () => {
    const user = userEvent.setup();
    const resolutions: string[] = [];
    server.use(
      http.get("*/api/v1/sync/conflicts", () =>
        HttpResponse.json([
          {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            clientSaleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            stockConflictFlag: true,
          },
        ]),
      ),
      http.post("*/api/v1/sync/conflicts/:saleId/resolve", async ({ request }) => {
        const body = (await request.json()) as { resolution: string };
        resolutions.push(body.resolution);
        return HttpResponse.json({ ok: true });
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <StockConflictReview />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("button", { name: /accept as-is/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /accept as-is/i }));
    await user.type(screen.getByLabelText(/adjustment reason/i), "count corrected");
    await user.click(screen.getByRole("button", { name: /adjust with reason/i }));
    await vi.waitFor(() => {
      expect(resolutions).toEqual(["acceptAsIs", "adjustWithReason"]);
    });
  });
});
