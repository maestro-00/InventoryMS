import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { ownerSessionRecord, renderWithProviders } from "../../../shared/test/render";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us3 from "../../../../tests/fixtures/provider/us3";
import { StockLevelsView } from "./stock-levels-view";
import { MovementsPanel } from "../movements/movements-panel";

describe("stock levels and profit fields", () => {
  it("shows avg unit cost for ViewProfit", async () => {
    server.use(
      http.get("*/api/v1/locations", () => HttpResponse.json([us1.locationRecord])),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [us3.stockAtA],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    renderWithProviders(<StockLevelsView />);
    expect(await screen.findByText(/avg unit cost/i)).toBeInTheDocument();
    expect(screen.getByText(/6\.00/)).toBeInTheDocument();
  });

  it("hides cost columns without ViewProfit", async () => {
    server.use(
      http.get("*/api/v1/locations", () => HttpResponse.json([us1.locationRecord])),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [us3.stockWithoutProfit],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    renderWithProviders(<StockLevelsView />, {
      session: {
        ...ownerSessionRecord,
        permissions: ownerSessionRecord.permissions.filter(
          (permission) => permission !== "ViewProfit",
        ),
      },
    });
    expect(
      await screen.findByText(/cost and valuation fields are hidden/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/avg unit cost/i)).not.toBeInTheDocument();
  });

  it("requests a business-wide rollup when the checkbox is checked", async () => {
    const user = userEvent.setup();
    let groupBy: string | null = null;
    server.use(
      http.get("*/api/v1/locations", () => HttpResponse.json([us1.locationRecord])),
      http.get("*/api/v1/stock", ({ request }) => {
        groupBy = new URL(request.url).searchParams.get("groupBy");
        return HttpResponse.json({
          items: [us3.stockRollup],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        });
      }),
    );
    renderWithProviders(<StockLevelsView />);
    await user.click(await screen.findByLabelText(/business-wide rollup/i));
    expect(await screen.findByText(/all locations/i)).toBeInTheDocument();
    expect(groupBy).toBe("product");
  });
});

describe("movement corrections", () => {
  it("keeps the original movement and posts a correction", async () => {
    const user = userEvent.setup();
    let corrected = false;
    server.use(
      http.get("*/api/v1/stock/movements", () =>
        HttpResponse.json({
          items: [us3.movementRecord],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post(`*/api/v1/stock/movements/${us3.MOVEMENT_ID}/correct`, () => {
        corrected = true;
        return HttpResponse.json(us3.correctionMovement);
      }),
    );
    renderWithProviders(<MovementsPanel />);
    expect(await screen.findByText(/original ledger entry/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /correct movement/i }));
    await user.clear(screen.getByLabelText(/corrected quantity delta/i));
    await user.type(screen.getByLabelText(/corrected quantity delta/i), "8");
    await user.type(screen.getByLabelText(/correction note/i), "Counted over");
    await user.click(screen.getByRole("button", { name: /save correction/i }));
    expect(corrected).toBe(true);
  });

  it("filters movements by type", async () => {
    const user = userEvent.setup();
    let requestedType: string | null = null;
    server.use(
      http.get("*/api/v1/stock/movements", ({ request }) => {
        requestedType = new URL(request.url).searchParams.get("type");
        return HttpResponse.json({
          items: requestedType
            ? [us3.movementRecord]
            : [us3.movementRecord, us3.correctionMovement],
          page: 1,
          pageSize: 50,
          totalCount: requestedType ? 1 : 2,
        });
      }),
    );
    renderWithProviders(<MovementsPanel />);
    expect(await screen.findByText(/original ledger entry/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/movement type/i), "Adjustment");
    await waitFor(() => {
      expect(requestedType).toBe("Adjustment");
    });
  });
});
