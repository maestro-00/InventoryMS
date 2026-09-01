import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../shared/test/msw/server";
import { renderWithProviders } from "../../shared/test/render";
import {
  selectRadixOption,
  waitForRadixSelectOptions,
} from "../../shared/test/select-radix";
import { LocationForm } from "./locations/location-form";
import { LocationList } from "./locations/location-list";
import { OpeningStockForm } from "./opening-stock/opening-stock-form";
import {
  adjustmentResult,
  locationRecord,
  pagedProducts,
  stockLevel,
  validationProblem,
  LOCATION_ID,
  PRODUCT_ID,
} from "../../../tests/fixtures/provider/us1";

describe("location form", () => {
  it("creates the first location", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    let sent: Record<string, unknown> | null = null;
    server.use(
      http.post("*/api/v1/locations", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(locationRecord, { status: 201 });
      }),
    );

    renderWithProviders(<LocationForm onSaved={onSaved} />);

    await user.type(screen.getByLabelText(/location name/i), "Main Shop");
    await user.type(screen.getByLabelText(/address/i), "12 Oxford Street, Accra");
    await user.click(screen.getByRole("button", { name: /save location/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });
    expect(sent).toMatchObject({ name: "Main Shop", kind: "Shop" });
  });

  it("shows the plan limit and keeps the entered values", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/locations", () =>
        HttpResponse.json(
          {
            title: "Plan limit reached",
            status: 402,
            detail: "The Starter plan allows 1 location.",
            upgradeHint: "Upgrade to Professional for more locations.",
          },
          { status: 402, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );

    renderWithProviders(<LocationForm onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText(/location name/i), "Second Shop");
    await user.click(screen.getByRole("button", { name: /save location/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/plan limit reached/i);
    expect(alert).toHaveTextContent(/upgrade to professional/i);
    expect(screen.getByLabelText(/location name/i)).toHaveValue("Second Shop");
  });

  it("re-submits an edit with the If-Match header from the loaded record", async () => {
    const user = userEvent.setup();
    let ifMatch: string | null = null;
    server.use(
      http.patch(`*/api/v1/locations/${LOCATION_ID}`, ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return HttpResponse.json(locationRecord);
      }),
    );

    renderWithProviders(
      <LocationForm
        onSaved={vi.fn()}
        location={{ ...locationRecord }}
        etag={'W/"location-1"'}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save location/i }));

    await waitFor(() => {
      expect(ifMatch).toBe('W/"location-1"');
    });
  });
});

describe("location list", () => {
  it("lists locations and selects the active one", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    server.use(
      http.get("*/api/v1/locations", () => HttpResponse.json([locationRecord])),
    );

    renderWithProviders(<LocationList selectedId={undefined} onSelect={onSelect} />);

    await user.click(await screen.findByRole("button", { name: /select main shop/i }));

    expect(onSelect).toHaveBeenCalledWith(LOCATION_ID);
  });

  it("explains an empty location list with one primary action", async () => {
    server.use(http.get("*/api/v1/locations", () => HttpResponse.json([])));

    renderWithProviders(<LocationList selectedId={undefined} onSelect={vi.fn()} />);

    expect(
      await screen.findByRole("button", { name: /create your first location/i }),
    ).toBeInTheDocument();
  });
});

describe("opening stock", () => {
  function stockHandlers() {
    return [
      http.get("*/api/v1/locations", () => HttpResponse.json([locationRecord])),
      http.get("*/api/v1/products", () => HttpResponse.json(pagedProducts)),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    ];
  }

  it("records an opening quantity and shows the per-location outcome", async () => {
    const user = userEvent.setup();
    let sent: Record<string, unknown> | null = null;
    server.use(
      ...stockHandlers(),
      http.post("*/api/v1/stock/adjustments", async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(adjustmentResult);
      }),
    );

    renderWithProviders(<OpeningStockForm />);

    const locationField = await screen.findByLabelText(/location/i);
    await waitForRadixSelectOptions(locationField, /main shop/i);
    await selectRadixOption(user, locationField, LOCATION_ID);
    await selectRadixOption(user, screen.getByLabelText(/product/i), PRODUCT_ID);
    await user.clear(screen.getByLabelText(/opening quantity/i));
    await user.type(screen.getByLabelText(/opening quantity/i), "10");
    await user.click(screen.getByRole("button", { name: /record opening stock/i }));

    await waitFor(() => {
      expect(sent).toMatchObject({
        locationId: LOCATION_ID,
        reasonCode: "Correction",
        lines: [{ productId: PRODUCT_ID, qtyDelta: 10 }],
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/applied/i);
    expect(await screen.findByText(/Main Shop/)).toBeInTheDocument();
  });

  it("rejects a quantity with more than three decimal places", async () => {
    const user = userEvent.setup();
    server.use(...stockHandlers());

    renderWithProviders(<OpeningStockForm />);

    const locationField = await screen.findByLabelText(/location/i);
    await waitForRadixSelectOptions(locationField, /main shop/i);
    await selectRadixOption(user, locationField, LOCATION_ID);
    await selectRadixOption(user, screen.getByLabelText(/product/i), PRODUCT_ID);
    await user.clear(screen.getByLabelText(/opening quantity/i));
    await user.type(screen.getByLabelText(/opening quantity/i), "10.00001");
    await user.click(screen.getByRole("button", { name: /record opening stock/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/three decimal places/i);
  });

  it("preserves the entry when the provider rejects the adjustment", async () => {
    const user = userEvent.setup();
    server.use(
      ...stockHandlers(),
      http.post("*/api/v1/stock/adjustments", () =>
        HttpResponse.json(validationProblem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    renderWithProviders(<OpeningStockForm />);

    const locationField = await screen.findByLabelText(/location/i);
    await waitForRadixSelectOptions(locationField, /main shop/i);
    await selectRadixOption(user, locationField, LOCATION_ID);
    await selectRadixOption(user, screen.getByLabelText(/product/i), PRODUCT_ID);
    await user.clear(screen.getByLabelText(/opening quantity/i));
    await user.type(screen.getByLabelText(/opening quantity/i), "10");
    await user.click(screen.getByRole("button", { name: /record opening stock/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/validation failed/i);
    expect(screen.getByLabelText(/opening quantity/i)).toHaveValue("10");
  });
});
