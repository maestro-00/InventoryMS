import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { renderWithRouter } from "../../../shared/test/render-router";
import { BatchList } from "./batch-list";
import { ExpiryAlerts } from "./expiry-alerts";
import { BatchTrace } from "./batch-trace";

const BATCH_ID = "d1111111-1111-4111-8111-111111111111";

describe("batches", () => {
  it("orders batches FEFO and filters expiry horizon", async () => {
    const user = userEvent.setup();
    const batches = [
      {
        id: "d2222222-2222-4222-8222-222222222222",
        batchNumber: "BATCH-2",
        qty: "12",
        expiresAt: "2026-10-01T00:00:00.000Z",
      },
      {
        id: BATCH_ID,
        batchNumber: "BATCH-1",
        qty: "8",
        expiresAt: "2026-08-20T00:00:00.000Z",
        damagedQty: "1",
      },
    ];
    renderWithRouter(
      <>
        <BatchList batches={batches} />
        <ExpiryAlerts
          batches={batches}
          horizonDays={30}
          onHorizonChange={() => undefined}
        />
      </>,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/batch-1/i);
    expect(screen.getByText(/batch-1 expires/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/expiry horizon days/i), "7");
  });

  it("renders recall trace from supplier through sales", async () => {
    server.use(
      http.get("*/api/v1/batches/:id/trace", () =>
        HttpResponse.json({
          batchId: BATCH_ID,
          batchNumber: "BATCH-1",
          productId: "44444444-4444-4444-8444-444444444444",
          supplier: {
            id: "44444444-4444-4444-8444-444444444401",
            name: "Tema Wholesale",
          },
          receipts: [
            {
              id: "e1111111-1111-4111-8111-111111111111",
              receiptNumber: "GR-1",
              receivedAt: "2026-08-01T00:00:00.000Z",
              quantity: 10,
              damagedQuantity: 1,
              locationId: "33333333-3333-4333-8333-333333333333",
            },
          ],
          sales: [
            {
              id: "a9999999-9999-4999-8999-999999999999",
              occurredAt: "2026-08-10T00:00:00.000Z",
              quantity: 2,
              cashierId: "11111111-1111-4111-8111-111111111111",
              locationId: "33333333-3333-4333-8333-333333333333",
            },
          ],
        }),
      ),
    );
    renderWithRouter(<BatchTrace batchId={BATCH_ID} />);
    expect(await screen.findByText(/from tema wholesale/i)).toBeInTheDocument();
    expect(screen.getByText(/gr-1/i)).toBeInTheDocument();
    expect(screen.getByText(/affected sales/i)).toBeInTheDocument();
  });
});
