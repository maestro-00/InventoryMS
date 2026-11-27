import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../../shared/test/msw/server";
import { CloseShiftForm } from "./close-shift";
import { CashMovementForm } from "./cash-movement";
import { ZReport } from "./z-report";
import { sessionManager } from "../../../shared/auth/session-manager";
import { ownerSession } from "../../../../tests/fixtures/provider/session";
import { selectRadixOption } from "../../../shared/test/select-radix";

const shiftId = "11111111-1111-4111-8111-111111111111";

describe("shift reconciliation", () => {
  it("requires counted close and cash movement reasons", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CashMovementForm shiftId={shiftId} />
        <CloseShiftForm shiftId={shiftId} />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/closing counted cash/i)).toBeInTheDocument();
  });

  it("records cash movement and closes the shift", async () => {
    const user = userEvent.setup();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    let cashBody: unknown;
    let closeBody: unknown;
    let expectedCash = 100;
    server.use(
      http.get(`*/api/v1/shifts/${shiftId}/z-report`, () =>
        HttpResponse.json({
          shiftId,
          sales: 0,
          cashTendered: 0,
          refunds: 0,
          discounts: 0,
          voids: 0,
          expectedCash,
          countedCash: null,
          variance: null,
        }),
      ),
      http.post(`*/api/v1/shifts/${shiftId}/cash-movements`, async ({ request }) => {
        cashBody = await request.json();
        expectedCash = 80;
        return HttpResponse.json({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          type: "CashOut",
          reason: "Banking",
          amount: 20,
        });
      }),
      http.post(`*/api/v1/shifts/${shiftId}/close`, async ({ request }) => {
        closeBody = await request.json();
        return HttpResponse.json({
          id: shiftId,
          registerId: "22222222-2222-4222-8222-222222222222",
          openedBy: "owner@kwame.gh",
          openedAt: "2026-08-13T08:00:00.000Z",
          openingFloat: 100,
          status: "Closed",
        });
      }),
    );
    const onClosed = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CashMovementForm shiftId={shiftId} />
        <CloseShiftForm shiftId={shiftId} onClosed={onClosed} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("GH₵100.00")).toBeInTheDocument();
    const counted = screen.getByLabelText(/closing counted cash/i);
    await user.type(counted, "80.00");
    expect(screen.getByText("Projected variance").nextElementSibling).toHaveTextContent(
      "-GH₵20.00",
    );
    await selectRadixOption(user, screen.getByLabelText(/^direction/i), "CashOut");
    await selectRadixOption(user, screen.getByLabelText(/^reason/i), "Banking");
    const amount = screen.getByLabelText(/^amount/i);
    await user.clear(amount);
    await user.type(amount, "20.00");
    await user.click(screen.getByRole("button", { name: /record movement/i }));
    expect(await screen.findByText("GH₵80.00")).toBeInTheDocument();
    expect(screen.getByText("Projected variance").nextElementSibling).toHaveTextContent(
      "GH₵0.00",
    );
    await user.click(screen.getByRole("button", { name: /close with count/i }));
    expect(
      screen.getByRole("alertdialog", { name: /close shift/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close shift" }));
    await vi.waitFor(() => {
      expect(cashBody).toMatchObject({
        type: "CashOut",
        reason: "Banking",
        amount: 20,
      });
      expect(closeBody).toEqual({ closingCounted: 80 });
      expect(onClosed).toHaveBeenCalled();
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/shift closed/i);
  });

  it("shows an actionable error when InventoryX rejects the close", async () => {
    const user = userEvent.setup();
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get(`*/api/v1/shifts/${shiftId}/z-report`, () =>
        HttpResponse.json({
          shiftId,
          sales: 0,
          cashTendered: 0,
          refunds: 0,
          discounts: 0,
          voids: 0,
          expectedCash: 100,
          countedCash: null,
          variance: null,
        }),
      ),
      http.post(`*/api/v1/shifts/${shiftId}/close`, () =>
        HttpResponse.json(
          {
            type: "https://inventoryx.app/problems/not-found",
            title: "Resource not found.",
            status: 404,
            detail: "Open shift not found.",
            traceId: "trace-close-404",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CloseShiftForm shiftId={shiftId} />
      </QueryClientProvider>,
    );
    await user.type(screen.getByLabelText(/closing counted cash/i), "0.00");
    await user.click(screen.getByRole("button", { name: /close with count/i }));
    await user.click(screen.getByRole("button", { name: "Close shift" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/open shift not found/i);
  });

  it("loads a Z report with tender breakdown", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get(`*/api/v1/shifts/${shiftId}/z-report`, () =>
        HttpResponse.json({
          shiftId,
          sales: "100.00",
          cashTendered: "78.00",
          refunds: "0.00",
          discounts: "0.00",
          voids: 0,
          expectedCash: "80.00",
          countedCash: "78.00",
          variance: "-2.00",
        }),
      ),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ZReport shiftId={shiftId} />
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole("article", { name: /z report/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /cash tendered/i })).toHaveTextContent(
      "GH₵78.00",
    );
    expect(screen.getByRole("row", { name: /variance/i })).toHaveTextContent(
      "-GH₵2.00",
    );
  });
});
