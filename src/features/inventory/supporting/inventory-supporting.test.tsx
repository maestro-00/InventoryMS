import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { renderWithProviders } from "../../../shared/test/render";
import { selectRadixOption } from "../../../shared/test/select-radix";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us3 from "../../../../tests/fixtures/provider/us3";
import { AlertsPanel } from "../alerts/alerts-panel";
import { ReorderSuggestions } from "../reorder/reorder-suggestions";
import { ConsumptionForm } from "../consumption/consumption-form";

describe("alerts and reorder suggestions", () => {
  it("filters alerts by type and keeps thresholds read-only", async () => {
    const user = userEvent.setup();
    server.use(http.get("*/api/v1/alerts", () => HttpResponse.json(us3.alerts)));
    renderWithProviders(<AlertsPanel />);
    expect(await screen.findByText(/sugar 1kg is below reorder/i)).toBeInTheDocument();
    expect(screen.getByText(/thresholds follow inventoryx/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/alert type/i), "Expiry");
    expect(screen.getByText(/batch near expiry/i)).toBeInTheDocument();
    expect(screen.queryByText(/sugar 1kg is below reorder/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/alert type/i), "Overstock");
    expect(screen.getByText(/no open alerts for this filter/i)).toBeInTheDocument();
  });

  it("groups reorder suggestions by supplier without offering PO creation", async () => {
    server.use(
      http.get("*/api/v1/reorder/suggestions", () =>
        HttpResponse.json(us3.reorderSuggestions),
      ),
    );
    renderWithProviders(<ReorderSuggestions />);
    expect(await screen.findByText(/tema wholesale/i)).toBeInTheDocument();
    expect(screen.getByText(/sugar 1kg/i)).toBeInTheDocument();
    expect(screen.getByText(/review only/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create purchase order/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty reorder state", async () => {
    server.use(
      http.get("*/api/v1/reorder/suggestions", () => HttpResponse.json({ items: [] })),
    );
    renderWithProviders(<ReorderSuggestions />);
    expect(await screen.findByText(/no reorder suggestions/i)).toBeInTheDocument();
  });
});

describe("internal consumption", () => {
  it("records consumption with a non-correction reason", async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.get("*/api/v1/locations", () =>
        HttpResponse.json([us1.locationRecord, us3.locationB]),
      ),
      http.get("*/api/v1/products", () => HttpResponse.json(us1.pagedProducts)),
      http.get("*/api/v1/stock/adjustment-reasons", () =>
        HttpResponse.json(us3.adjustmentReasons),
      ),
      http.post("*/api/v1/stock/consumption", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(us3.appliedAdjustment);
      }),
    );
    renderWithProviders(<ConsumptionForm />);
    await selectRadixOption(
      user,
      await screen.findByLabelText(/^location/i),
      us1.LOCATION_ID,
    );
    await selectRadixOption(user, screen.getByLabelText(/^product/i), us1.PRODUCT_ID);
    await user.type(screen.getByLabelText(/quantity used/i), "-1");
    await selectRadixOption(user, screen.getByLabelText(/^reason/i), "PersonalUse");
    await user.type(screen.getByLabelText(/^note/i), "Staff tea");
    await user.click(screen.getByRole("button", { name: /record consumption/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/consumption applied/i);
    });
    expect(body).toMatchObject({
      locationId: us1.LOCATION_ID,
      reasonCode: "PersonalUse",
      note: "Staff tea",
      lines: [{ productId: us1.PRODUCT_ID, qtyDelta: -1 }],
    });
  });
});
