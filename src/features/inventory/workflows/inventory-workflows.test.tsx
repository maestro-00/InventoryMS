import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { ownerSessionRecord, renderWithProviders } from "../../../shared/test/render";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us3 from "../../../../tests/fixtures/provider/us3";
import { AdjustmentForm } from "../adjustments/adjustment-form";
import { TransferWorkflow } from "../transfers/transfer-workflow";
import { CountWorkflow } from "../counts/count-workflow";

function catalogHandlers() {
  return [
    http.get("*/api/v1/locations", () =>
      HttpResponse.json([us1.locationRecord, us3.locationB]),
    ),
    http.get("*/api/v1/products", () => HttpResponse.json(us1.pagedProducts)),
    http.get("*/api/v1/stock/adjustment-reasons", () =>
      HttpResponse.json(us3.adjustmentReasons),
    ),
  ];
}

describe("adjustment approval separation", () => {
  it("pauses above-threshold adjustments and lets a manager approve", async () => {
    const user = userEvent.setup();
    server.use(
      ...catalogHandlers(),
      http.post("*/api/v1/stock/adjustments", () =>
        HttpResponse.json(us3.pendingAdjustment),
      ),
      http.post(`*/api/v1/stock/adjustments/${us3.ADJUSTMENT_ID}/approve`, () =>
        HttpResponse.json(us3.appliedAdjustment),
      ),
    );
    renderWithProviders(<AdjustmentForm />);
    await user.selectOptions(
      await screen.findByLabelText(/^location/i),
      us1.LOCATION_ID,
    );
    await user.selectOptions(screen.getByLabelText(/^product/i), us1.PRODUCT_ID);
    await user.type(screen.getByLabelText(/quantity delta/i), "-50");
    await user.selectOptions(screen.getByLabelText(/^reason/i), "Damage");
    await user.click(screen.getByRole("button", { name: /submit adjustment/i }));
    expect(await screen.findByText(/pending approval/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /approve adjustment/i }));
    await waitFor(() => {
      expect(screen.queryByText(/pending approval/i)).not.toBeInTheDocument();
    });
  });

  it("surfaces a same-approver denial from InventoryX", async () => {
    const user = userEvent.setup();
    server.use(
      ...catalogHandlers(),
      http.post("*/api/v1/stock/adjustments", () =>
        HttpResponse.json(us3.pendingAdjustment),
      ),
      http.post(`*/api/v1/stock/adjustments/${us3.ADJUSTMENT_ID}/approve`, () =>
        HttpResponse.json(us3.sameApproverProblem, {
          status: 403,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );
    renderWithProviders(<AdjustmentForm />);
    await user.selectOptions(
      await screen.findByLabelText(/^location/i),
      us1.LOCATION_ID,
    );
    await user.selectOptions(screen.getByLabelText(/^product/i), us1.PRODUCT_ID);
    await user.type(screen.getByLabelText(/quantity delta/i), "-50");
    await user.click(screen.getByRole("button", { name: /submit adjustment/i }));
    await user.click(
      await screen.findByRole("button", { name: /approve adjustment/i }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/different manager/i);
  });
});

describe("transfer discrepancy and count etag", () => {
  it("requires a discrepancy reason when receiving fewer units", async () => {
    const user = userEvent.setup();
    let receiveBody: unknown;
    let transferState: "Draft" | "Dispatched" | "ReceivedWithDiscrepancy" = "Draft";
    server.use(
      ...catalogHandlers(),
      http.post("*/api/v1/transfers", () => {
        transferState = "Draft";
        return HttpResponse.json(
          { id: us3.TRANSFER_ID, status: "Draft" },
          { status: 201 },
        );
      }),
      http.get("*/api/v1/transfers/:id", ({ params }) => {
        if (params["id"] !== us3.TRANSFER_ID) {
          return HttpResponse.json({ title: "Not found" }, { status: 404 });
        }
        if (transferState === "ReceivedWithDiscrepancy") {
          return HttpResponse.json(us3.transferReceived);
        }
        if (transferState === "Dispatched") {
          return HttpResponse.json(us3.transferDispatched);
        }
        return HttpResponse.json(us3.transferDraft);
      }),
      http.get("*/api/v1/transfers", () =>
        HttpResponse.json({
          items: transferState === "Dispatched" ? [us3.transferDispatched] : [],
          page: 1,
          pageSize: 50,
          totalCount: transferState === "Dispatched" ? 1 : 0,
        }),
      ),
      http.post("*/api/v1/transfers/:id/dispatch", ({ params }) => {
        if (params["id"] !== us3.TRANSFER_ID) {
          return HttpResponse.json({ title: "Not found" }, { status: 404 });
        }
        transferState = "Dispatched";
        return HttpResponse.json({ id: us3.TRANSFER_ID, status: "Dispatched" });
      }),
      http.post("*/api/v1/transfers/:id/receive", async ({ params, request }) => {
        if (params["id"] !== us3.TRANSFER_ID) {
          return HttpResponse.json({ title: "Not found" }, { status: 404 });
        }
        receiveBody = await request.json();
        transferState = "ReceivedWithDiscrepancy";
        return HttpResponse.json({
          id: us3.TRANSFER_ID,
          status: "ReceivedWithDiscrepancy",
          discrepancyReason: "Two bags damaged in transit",
        });
      }),
    );
    renderWithProviders(<TransferWorkflow />);
    await user.selectOptions(
      await screen.findByLabelText(/from location/i),
      us1.LOCATION_ID,
    );
    await user.selectOptions(screen.getByLabelText(/to location/i), us3.LOCATION_B_ID);
    await user.selectOptions(screen.getByLabelText(/^product/i), us1.PRODUCT_ID);
    await user.clear(screen.getByLabelText(/quantity to dispatch/i));
    await user.type(screen.getByLabelText(/quantity to dispatch/i), "10");
    await user.click(screen.getByRole("button", { name: /create draft transfer/i }));
    await user.click(await screen.findByRole("button", { name: /dispatch transfer/i }));
    await user.clear(await screen.findByLabelText(/quantity received/i));
    await user.type(screen.getByLabelText(/quantity received/i), "8");
    await user.type(
      screen.getByLabelText(/discrepancy reason/i),
      "Two bags damaged in transit",
    );
    await user.click(screen.getByRole("button", { name: /receive transfer/i }));
    await waitFor(() => {
      expect(receiveBody).toMatchObject({
        discrepancyReason: "Two bags damaged in transit",
      });
    });
  });

  it("rejects a submitted count", async () => {
    const user = userEvent.setup();
    server.use(
      ...catalogHandlers(),
      http.post("*/api/v1/counts", () =>
        HttpResponse.json(us3.openCount, {
          status: 201,
          headers: { ETag: '"count-1"' },
        }),
      ),
      http.put(`*/api/v1/counts/${us3.COUNT_ID}/lines`, () =>
        HttpResponse.json(us3.submittedCount, { headers: { ETag: '"count-2"' } }),
      ),
      http.post(`*/api/v1/counts/${us3.COUNT_ID}/submit`, () =>
        HttpResponse.json(us3.submittedCount),
      ),
      http.post(`*/api/v1/counts/${us3.COUNT_ID}/reject`, () =>
        HttpResponse.json({ ...us3.submittedCount, status: "Rejected" }),
      ),
    );
    renderWithProviders(<CountWorkflow />, { session: ownerSessionRecord });
    await user.selectOptions(
      await screen.findByLabelText(/^location/i),
      us1.LOCATION_ID,
    );
    await user.selectOptions(screen.getByLabelText(/count scope/i), "Full");
    await user.click(screen.getByRole("button", { name: /open count/i }));
    await user.type(await screen.findByLabelText(/counted quantity/i), "7");
    await user.click(screen.getByRole("button", { name: /save counted lines/i }));
    await user.click(await screen.findByRole("button", { name: /submit count/i }));
    await user.click(await screen.findByRole("button", { name: /reject count/i }));
    expect(await screen.findByText(/Rejected/i)).toBeInTheDocument();
  });

  it("matches a scanned barcode to a catalogue product during counting", async () => {
    const user = userEvent.setup();
    server.use(
      ...catalogHandlers(),
      http.post("*/api/v1/counts", () =>
        HttpResponse.json(us3.openCount, {
          status: 201,
          headers: { ETag: '"count-1"' },
        }),
      ),
    );
    renderWithProviders(<CountWorkflow />, { session: ownerSessionRecord });
    await user.selectOptions(
      await screen.findByLabelText(/^location/i),
      us1.LOCATION_ID,
    );
    await user.selectOptions(screen.getByLabelText(/count scope/i), "Spot");
    await user.click(screen.getByRole("button", { name: /open count/i }));
    await screen.findByLabelText(/counted quantity/i);
    for (const key of "6001234567890") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/^product/i)).toHaveValue(us1.PRODUCT_ID);
    });
  });

  it("opens a dispatched transfer from the awaiting-receipt list", async () => {
    const user = userEvent.setup();
    server.use(
      ...catalogHandlers(),
      http.post("*/api/v1/transfers", () =>
        HttpResponse.json(
          { id: us3.TRANSFER_ID, status: "Draft", discrepancyReason: null },
          { status: 201 },
        ),
      ),
      http.post(`*/api/v1/transfers/${us3.TRANSFER_ID}/dispatch`, () =>
        HttpResponse.json({
          id: us3.TRANSFER_ID,
          status: "Dispatched",
          discrepancyReason: null,
        }),
      ),
    );

    // Live InventoryX has no transfer list GET; the UI reads the session cache seeded by
    // create/dispatch. Drive those mutations first so awaiting-receipt can render.
    const { createTransfer, dispatchTransfer } =
      await import("../transfers/api/transfers-api");
    await createTransfer({
      fromLocationId: us1.LOCATION_ID,
      toLocationId: us3.LOCATION_B_ID,
      lines: [{ productId: us1.PRODUCT_ID, quantity: "10" }],
    });
    await dispatchTransfer(us3.TRANSFER_ID);

    renderWithProviders(<TransferWorkflow />);
    await user.click(
      await screen.findByRole("button", {
        name: new RegExp(`open transfer ${us3.TRANSFER_ID.slice(0, 8)}`, "i"),
      }),
    );
    expect(await screen.findByLabelText(/quantity received/i)).toBeInTheDocument();
  });

  it("recovers from a stale count ETag on line save", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      ...catalogHandlers(),
      http.post("*/api/v1/counts", () =>
        HttpResponse.json(us3.openCount, {
          status: 201,
          headers: { ETag: '"count-1"' },
        }),
      ),
      http.put(`*/api/v1/counts/${us3.COUNT_ID}/lines`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(us3.staleEtagProblem, {
            status: 409,
            headers: { "Content-Type": "application/problem+json" },
          });
        }
        return HttpResponse.json(us3.submittedCount, {
          headers: { ETag: '"count-2"' },
        });
      }),
      http.post(`*/api/v1/counts/${us3.COUNT_ID}/submit`, () =>
        HttpResponse.json(us3.submittedCount),
      ),
      http.post(`*/api/v1/counts/${us3.COUNT_ID}/approve`, () =>
        HttpResponse.json(us3.approvedCount),
      ),
    );
    renderWithProviders(<CountWorkflow />, { session: ownerSessionRecord });
    await user.selectOptions(
      await screen.findByLabelText(/^location/i),
      us1.LOCATION_ID,
    );
    await user.selectOptions(screen.getByLabelText(/count scope/i), "Spot");
    await user.selectOptions(screen.getByLabelText(/^product/i), us1.PRODUCT_ID);
    await user.click(screen.getByRole("button", { name: /open count/i }));
    await user.type(await screen.findByLabelText(/counted quantity/i), "7");
    await user.click(screen.getByRole("button", { name: /save counted lines/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /changed since you loaded/i,
    );
    await user.click(screen.getByRole("button", { name: /save counted lines/i }));
    await user.click(await screen.findByRole("button", { name: /submit count/i }));
    await user.click(await screen.findByRole("button", { name: /approve count/i }));
    expect(await screen.findByText(/Approved/i)).toBeInTheDocument();
  });
});
