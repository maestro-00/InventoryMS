import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "../../../shared/test/msw/server";
import { ownerSessionRecord, renderWithProviders } from "../../../shared/test/render";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import * as us2 from "../../../../tests/fixtures/provider/us2";
import { productSchema } from "../../catalogue/products/api/products-api";
import { HardwareScanner } from "./hardware-scanner";
import { CameraScanner } from "./camera-scanner";
import { ProductSearch } from "./product-search";
import { UnknownBarcode } from "./unknown-barcode";
import { FavouritesGrid } from "./favourites-grid";

function barcodeHandlers() {
  return [
    http.get("*/api/v1/products/barcode/:barcode", ({ params }) => {
      if (params["barcode"] === "6001234567890") {
        return HttpResponse.json(us1.productRecord);
      }
      return HttpResponse.json(us2.unknownBarcodeProblem, {
        status: 404,
        headers: { "Content-Type": "application/problem+json" },
      });
    }),
    http.get("*/api/v1/products", ({ request }) => {
      const search = new URL(request.url).searchParams.get("search") ?? "";
      const items = [us1.productRecord, us2.riceRecord, us2.oilRecord].filter(
        (product) =>
          search === "" ||
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          "sugar".startsWith(search.toLowerCase()) ||
          search.toLowerCase() === "sugr",
      );
      return HttpResponse.json({
        items: search.toLowerCase() === "sugr" ? [us1.productRecord] : items,
        page: 1,
        pageSize: 50,
        totalCount: items.length,
      });
    }),
    http.get(`*/api/v1/registers/${us1.REGISTER_ID}/favourites`, () =>
      HttpResponse.json(us2.favouritesLayout),
    ),
    http.get("*/api/v1/tax-treatments", () => HttpResponse.json(us1.taxTreatments)),
    http.get("*/api/v1/categories", () => HttpResponse.json(us1.categoryTree)),
    http.post("*/api/v1/products", async ({ request }) => {
      const body = (await request.json()) as { barcode?: string; name: string };
      return HttpResponse.json(
        { ...us1.productRecord, name: body.name, barcode: body.barcode ?? null },
        { status: 201 },
      );
    }),
  ];
}

describe("hardware keyboard-wedge scanner", () => {
  it("buffers a burst of keystrokes and emits one barcode", async () => {
    const onScan = vi.fn();
    renderWithProviders(<HardwareScanner onScan={onScan} />);

    for (const key of "6001234567890") {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    await waitFor(() => {
      expect(onScan).toHaveBeenCalledTimes(1);
    });
    expect(onScan).toHaveBeenCalledWith("6001234567890");
  });

  it("ignores modifier chords and short bursts that are not barcodes", () => {
    const onScan = vi.fn();
    renderWithProviders(<HardwareScanner onScan={onScan} />);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }),
    );
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    expect(onScan).not.toHaveBeenCalled();
  });

  it("still captures from a field marked for barcode capture", async () => {
    const onScan = vi.fn();
    renderWithProviders(
      <div>
        <input data-barcode-capture="" aria-label="Capture" />
        <HardwareScanner onScan={onScan} />
      </div>,
    );

    const field = screen.getByLabelText(/capture/i);
    field.focus();
    for (const key of "6001234567890") {
      field.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    await waitFor(() => {
      expect(onScan).toHaveBeenCalledWith("6001234567890");
    });
  });

  it("ignores typing that happens inside a labelled text field", async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    renderWithProviders(
      <div>
        <label htmlFor="note">Line note</label>
        <input id="note" />
        <HardwareScanner onScan={onScan} />
      </div>,
    );

    await user.type(screen.getByLabelText(/line note/i), "6001234567890{Enter}");
    expect(onScan).not.toHaveBeenCalled();
  });
});

describe("camera scanner", () => {
  const originalMedia = navigator.mediaDevices;

  afterEach(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: originalMedia,
    });
    vi.unstubAllGlobals();
  });

  it("uses the native barcode detector when permission is granted", async () => {
    const stop = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop }],
        }),
      },
    });
    class FakeDetector {
      detect = vi.fn().mockResolvedValue([{ rawValue: "6001234567890" }]);
    }
    vi.stubGlobal("BarcodeDetector", FakeDetector);

    const onScan = vi.fn();
    renderWithProviders(<CameraScanner onScan={onScan} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /scan with camera/i }));
    await waitFor(() => {
      expect(onScan).toHaveBeenCalledWith("6001234567890");
    });
  });

  it("falls back to typed entry when the camera is denied", async () => {
    const denied = Object.assign(new Error("Permission denied"), {
      name: "NotAllowedError",
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(denied),
      },
    });

    renderWithProviders(<CameraScanner onScan={vi.fn()} />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /scan with camera/i }));

    expect(
      await screen.findByText(/camera permission was denied/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/type the barcode/i)).toBeVisible();
  });

  it("submits a typed barcode after camera permission is denied", async () => {
    const denied = Object.assign(new Error("Permission denied"), {
      name: "NotAllowedError",
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(denied),
      },
    });

    const onScan = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CameraScanner onScan={onScan} />);
    await user.click(screen.getByRole("button", { name: /scan with camera/i }));
    await user.type(await screen.findByLabelText(/type the barcode/i), "6001234567890");
    await user.click(screen.getByRole("button", { name: /add typed barcode/i }));

    expect(onScan).toHaveBeenCalledWith("6001234567890");
  });
});

describe("typo-tolerant search and favourites", () => {
  it("returns a misspelled name in an accessible combobox and adds it", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    server.use(...barcodeHandlers());
    renderWithProviders(<ProductSearch onAdd={onAdd} />);

    await user.type(screen.getByRole("combobox", { name: /search products/i }), "sugr");
    const option = await screen.findByRole("option", { name: /sugar 1kg/i });
    await user.click(option);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ productId: us1.PRODUCT_ID, productName: "Sugar 1kg" }),
    );
  });

  it("renders the register favourites grid from the saved layout", async () => {
    const onAdd = vi.fn();
    server.use(...barcodeHandlers());
    renderWithProviders(
      <FavouritesGrid
        registerId={us1.REGISTER_ID}
        products={[
          productSchema.parse(us1.productRecord),
          productSchema.parse(us2.riceRecord),
          productSchema.parse(us2.oilRecord),
        ]}
        onAdd={onAdd}
      />,
    );

    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: /add cooking oil 1l/i }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ productId: us2.OIL_ID }),
    );
  });
});

describe("unknown barcode", () => {
  it("shows a no-match result and does not claim shared-catalogue enrichment", async () => {
    server.use(...barcodeHandlers());
    renderWithProviders(
      <UnknownBarcode
        barcode="0000000000000"
        onCreated={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/no product matches this barcode/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/shared catalogue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gs1/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create this product/i })).toBeVisible();
  });

  it("hides the manual create path when the cashier cannot manage pricing", async () => {
    renderWithProviders(
      <UnknownBarcode
        barcode="0000000000000"
        onCreated={vi.fn()}
        onDismiss={vi.fn()}
      />,
      {
        session: {
          ...ownerSessionRecord,
          permissions: ["Sell"],
        },
      },
    );

    expect(
      await screen.findByText(/no product matches this barcode/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create this product/i }),
    ).not.toBeInTheDocument();
  });

  it("creates a tenant product from the unknown barcode without catalogue enrichment", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    server.use(...barcodeHandlers());
    renderWithProviders(
      <UnknownBarcode
        barcode="0000000000000"
        onCreated={onCreated}
        onDismiss={vi.fn()}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: /create this product/i }),
    );
    await user.click(screen.getByRole("button", { name: /save product/i }));
    expect(onCreated).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/product name/i), "New bar");
    await user.type(screen.getByLabelText(/^sku/i), "NEW-001");
    await user.type(screen.getByLabelText(/selling price/i), "4.00");
    await user.type(screen.getByLabelText(/cost price/i), "2.00");
    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ productName: "New bar" }),
      );
    });
  });
});
