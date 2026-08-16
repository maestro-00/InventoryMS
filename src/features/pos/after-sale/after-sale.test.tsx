import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { renderWithProviders } from "../../../shared/test/render";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us2 from "../../../../tests/fixtures/provider/us2";
import { AfterSalePanel } from "./after-sale-panel";
import { ReceiptDelivery } from "../receipts/receipt-delivery";
import { eligibleReturnQty } from "./eligible-return";
import { productSchema } from "../../catalogue/products/api/products-api";

function afterSaleHandlers() {
  return [
    http.get("*/api/v1/sales/lookup", () => HttpResponse.json([us1.completedSale])),
    http.post("*/api/v1/returns", () => HttpResponse.json(us2.returnTransaction)),
    http.post("*/api/v1/returns/exchange", () =>
      HttpResponse.json(us2.exchangeTransaction),
    ),
    http.post(`*/api/v1/sales/${us1.SALE_ID}/void`, () =>
      HttpResponse.json(us2.voidedSale),
    ),
    http.post(`*/api/v1/sales/${us1.SALE_ID}/receipt/deliver`, async ({ request }) => {
      const body = (await request.json()) as { channel: string };
      return HttpResponse.json(
        body.channel === "Email"
          ? us2.receiptDeliverySuccess
          : us2.receiptDeliveryFailure,
      );
    }),
    http.get("*/api/v1/products", () =>
      HttpResponse.json({
        items: [us2.oilRecord],
        page: 1,
        pageSize: 50,
        totalCount: 1,
      }),
    ),
  ];
}

describe("eligible return quantity", () => {
  it("subtracts already-returned quantity from the original line", () => {
    const line = us1.completedSale.lines[0];
    if (!line) throw new Error("fixture sale is missing its line");
    expect(eligibleReturnQty({ ...line, qtyReturned: "1" })).toBe("1");
  });
});

describe("sale lookup, return, exchange, and void", () => {
  it("finds a sale by receipt number and returns one line to stock", async () => {
    const user = userEvent.setup();
    server.use(...afterSaleHandlers());
    renderWithProviders(
      <AfterSalePanel
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        products={[productSchema.parse(us2.oilRecord)]}
      />,
    );

    await user.type(screen.getByLabelText(/receipt number/i), "RCP-000001");
    await user.click(screen.getByRole("button", { name: /find sale/i }));
    const qtyField = await screen.findByLabelText(/return quantity for sugar 1kg/i);
    await user.clear(qtyField);
    await user.type(qtyField, "1");
    await user.selectOptions(
      screen.getByLabelText(/disposition for sugar 1kg/i),
      "ToStock",
    );
    await user.click(screen.getByRole("button", { name: /confirm return/i }));
    expect(await screen.findByText(/refund/i)).toBeInTheDocument();
  });

  it("records an exchange net settlement from the server", async () => {
    const user = userEvent.setup();
    server.use(...afterSaleHandlers());
    renderWithProviders(
      <AfterSalePanel
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        products={[productSchema.parse(us2.oilRecord)]}
      />,
    );

    await user.type(screen.getByLabelText(/receipt number/i), "RCP-000001");
    await user.click(screen.getByRole("button", { name: /find sale/i }));
    await user.type(
      await screen.findByLabelText(/return quantity for sugar 1kg/i),
      "1",
    );
    await user.click(screen.getByRole("button", { name: /add cooking oil 1l/i }));
    await user.click(screen.getByRole("button", { name: /confirm exchange/i }));

    expect(await screen.findByText(/net amount -8/i)).toBeInTheDocument();
  });

  it("voids the looked-up sale with a reason", async () => {
    const user = userEvent.setup();
    server.use(...afterSaleHandlers());
    renderWithProviders(
      <AfterSalePanel
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        products={[productSchema.parse(us2.oilRecord)]}
      />,
    );

    await user.type(screen.getByLabelText(/receipt number/i), "RCP-000001");
    await user.click(screen.getByRole("button", { name: /find sale/i }));
    await user.type(await screen.findByLabelText(/void reason/i), "Wrong register");
    await user.click(screen.getByRole("button", { name: /void this sale/i }));

    expect(await screen.findByText(/sale voided/i)).toBeInTheDocument();
  });

  it("surfaces a lookup failure without claiming a sale was found", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v1/sales/lookup", () =>
        HttpResponse.json(
          { title: "No sale matches that receipt.", status: 404 },
          { status: 404, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    renderWithProviders(
      <AfterSalePanel
        registerId={us1.REGISTER_ID}
        shiftId={us1.SHIFT_ID}
        products={[productSchema.parse(us2.oilRecord)]}
      />,
    );

    await user.type(screen.getByLabelText(/receipt number/i), "RCP-MISSING");
    await user.click(screen.getByRole("button", { name: /find sale/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no sale matches/i);
  });
});

describe("receipt delivery", () => {
  it("shows email success and SMS failure without changing the sale", async () => {
    const user = userEvent.setup();
    server.use(...afterSaleHandlers());
    renderWithProviders(<ReceiptDelivery saleId={us1.SALE_ID} />);

    await user.type(screen.getByLabelText(/email address/i), "customer@kwame.gh");
    await user.click(screen.getByRole("button", { name: /send email/i }));
    expect(await screen.findByText(/email queued/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/sms number/i), "+233200000000");
    await user.click(screen.getByRole("button", { name: /send sms/i }));
    expect(await screen.findByText(/carrier rejected/i)).toBeInTheDocument();
  });
});
