import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import { isProblemError } from "../../src/shared/api/errors/problem-error";
import {
  fetchProductByBarcode,
  fetchProductAvailability,
} from "../../src/features/catalogue/products/api/products-api";
import {
  fetchFavouritesLayout,
  saveFavouritesLayout,
} from "../../src/features/registers/favourites/api/favourites-api";
import {
  completeHeldSale,
  fetchHeldSale,
  fetchHeldSales,
  holdSale,
} from "../../src/features/pos/held-sales/api/held-sales-api";
import { completeSale } from "../../src/features/pos/checkout/online-checkout";
import {
  deliverReceipt,
  fetchReceipt,
} from "../../src/features/pos/receipts/api/receipts-api";
import {
  createExchange,
  createReturn,
  lookupSales,
  voidSale,
} from "../../src/features/pos/after-sale/api/after-sale-api";
import * as us1 from "../fixtures/provider/us1";
import * as us2 from "../fixtures/provider/us2";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US2_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/products"],
  ["get", "/api/v1/products/barcode/{barcode}"],
  ["post", "/api/v1/products"],
  ["get", "/api/v1/products/{id}/availability"],
  ["get", "/api/v1/registers/{registerId}/favourites"],
  ["put", "/api/v1/registers/{registerId}/favourites"],
  ["post", "/api/v1/sales"],
  ["get", "/api/v1/sales/held"],
  ["get", "/api/v1/sales/held/{id}"],
  ["post", "/api/v1/sales/{id}/complete"],
  ["get", "/api/v1/sales/lookup"],
  ["get", "/api/v1/sales/{id}"],
  ["get", "/api/v1/sales/{id}/receipt"],
  ["post", "/api/v1/sales/{id}/receipt/deliver"],
  ["post", "/api/v1/sales/{id}/void"],
  ["post", "/api/v1/returns"],
  ["post", "/api/v1/returns/exchange"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

describe("US2 provider contract surface", () => {
  it("captures every operation the counter-sale journey consumes", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US2_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(
        doc.paths[path]?.[method],
        `missing ${method.toUpperCase()} ${path}`,
      ).toBeDefined();
    }
  });
});

describe("barcode and live availability", () => {
  it("returns the matching tenant product for a known barcode", async () => {
    server.use(
      http.get("*/api/v1/products/barcode/:barcode", ({ params }) => {
        expect(params["barcode"]).toBe("6001234567890");
        return HttpResponse.json(us1.productRecord);
      }),
    );

    const product = await fetchProductByBarcode("6001234567890");
    expect(product.id).toBe(us1.PRODUCT_ID);
    expect(product.sellingPrice).toBe("10");
  });

  it("surfaces a not-found problem for an unknown barcode", async () => {
    server.use(
      http.get("*/api/v1/products/barcode/:barcode", () =>
        HttpResponse.json(us2.unknownBarcodeProblem, {
          status: 404,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    const failure = await fetchProductByBarcode("0000000000000").catch(
      (error: unknown) => error,
    );
    expect(isProblemError(failure)).toBe(true);
    if (isProblemError(failure)) {
      expect(failure.problem.kind).toBe("notFound");
    }
  });

  it("reads live other-location availability without inventing a quantity", async () => {
    server.use(
      http.get(`*/api/v1/products/${us1.PRODUCT_ID}/availability`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("locationId")).toBe(us1.LOCATION_ID);
        return HttpResponse.json(us2.availabilityLive);
      }),
    );

    const availability = await fetchProductAvailability(us1.PRODUCT_ID, {
      locationId: us1.LOCATION_ID,
    });
    expect(availability.qtyAvailable).toBe("10");
    expect(availability.inStock).toBe(true);
  });
});

describe("favourites layout", () => {
  it("round-trips the register favourites JSON without rewriting product prices", async () => {
    server.use(
      http.get(`*/api/v1/registers/${us1.REGISTER_ID}/favourites`, () =>
        HttpResponse.json(us2.favouritesLayout),
      ),
      http.put(
        `*/api/v1/registers/${us1.REGISTER_ID}/favourites`,
        async ({ request }) => {
          const body = (await request.json()) as { layoutJson: string };
          expect(JSON.parse(body.layoutJson)).toMatchObject({
            pages: [{ id: "page-1", productIds: [us1.PRODUCT_ID] }],
          });
          return HttpResponse.json({
            registerId: us1.REGISTER_ID,
            layoutJson: body.layoutJson,
          });
        },
      ),
    );

    const current = await fetchFavouritesLayout(us1.REGISTER_ID);
    expect(current.pages[0]?.productIds).toContain(us1.PRODUCT_ID);

    const saved = await saveFavouritesLayout(us1.REGISTER_ID, {
      pages: [{ id: "page-1", name: "Grocery", productIds: [us1.PRODUCT_ID] }],
    });
    expect(saved.pages[0]?.productIds).toEqual([us1.PRODUCT_ID]);
  });
});

describe("held sales and split completion", () => {
  it("creates a held sale that does not move stock and recalls the same lines", async () => {
    server.use(
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as { status: string };
        expect(body.status).toBe("Held");
        return HttpResponse.json(us2.heldSale, { status: 201 });
      }),
      http.get("*/api/v1/sales/held", () => HttpResponse.json([us2.heldSale])),
      http.get(`*/api/v1/sales/held/${us2.HELD_SALE_ID}`, () =>
        HttpResponse.json(us2.heldSale),
      ),
    );

    const held = await holdSale({
      clientSaleId: us2.heldSale.clientSaleId,
      registerId: us1.REGISTER_ID,
      shiftId: us1.SHIFT_ID,
      lines: [{ productId: us1.PRODUCT_ID, qty: "1" }],
    });
    expect(held.status).toBe("Held");
    expect(held.grandTotal).toBe("11.5");

    const listed = await fetchHeldSales();
    expect(listed).toHaveLength(1);
    expect((await fetchHeldSale(us2.HELD_SALE_ID)).id).toBe(us2.HELD_SALE_ID);
  });

  it("completes a held sale with split tenders using the server change amount", async () => {
    server.use(
      http.post(`*/api/v1/sales/${us2.HELD_SALE_ID}/complete`, async ({ request }) => {
        const body = (await request.json()) as {
          payments: { tender: string; amount: string }[];
        };
        expect(body.payments).toEqual([
          { tender: "Cash", amount: 50, reference: null },
          { tender: "Card", amount: 35, reference: "AUTH-44" },
        ]);
        return HttpResponse.json(us2.splitCompletedSale);
      }),
    );

    const completed = await completeHeldSale(us2.HELD_SALE_ID, [
      { tender: "Cash", amount: "50.00" },
      { tender: "Card", amount: "35.00", reference: "AUTH-44" },
    ]);
    expect(completed.changeDue).toBe("1.05");
    expect(completed.payments).toHaveLength(2);
  });

  it("posts a completed split sale in one request when the cart was never held", async () => {
    server.use(
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as {
          status: string;
          payments: unknown[];
        };
        expect(body.status).toBe("Completed");
        expect(body.payments).toHaveLength(2);
        return HttpResponse.json(us2.splitCompletedSale, { status: 201 });
      }),
    );

    const completed = await completeSale({
      clientSaleId: us2.splitCompletedSale.clientSaleId,
      registerId: us1.REGISTER_ID,
      shiftId: us1.SHIFT_ID,
      lines: [
        { productId: us1.PRODUCT_ID, qty: "2" },
        { productId: us2.RICE_ID, qty: "1" },
        { productId: us2.OIL_ID, qty: "1" },
      ],
      payments: [
        { tender: "Cash", amount: "50.00" },
        { tender: "Card", amount: "35.00", reference: "AUTH-44" },
      ],
    });
    expect(completed.grandTotal).toBe("83.95");
  });
});

describe("receipts, returns, exchanges, and voids", () => {
  it("delivers a final receipt and keeps failure separate from sale completion", async () => {
    server.use(
      http.get(`*/api/v1/sales/${us1.SALE_ID}/receipt`, () =>
        HttpResponse.json(us1.receiptRecord),
      ),
      http.post(
        `*/api/v1/sales/${us1.SALE_ID}/receipt/deliver`,
        async ({ request }) => {
          const body = (await request.json()) as {
            channel: string;
            destination: string;
          };
          expect(body).toEqual({ channel: "Sms", destination: "+233200000000" });
          return HttpResponse.json(us2.receiptDeliveryFailure);
        },
      ),
    );

    const receipt = await fetchReceipt(us1.SALE_ID);
    expect(receipt.number).toBe("RCP-000001");

    const delivery = await deliverReceipt(us1.SALE_ID, {
      channel: "Sms",
      destination: "+233200000000",
    });
    expect(delivery.success).toBe(false);
    expect(delivery.message).toMatch(/rejected/i);
  });

  it("looks up a sale and records a ToStock return at original price", async () => {
    server.use(
      http.get("*/api/v1/sales/lookup", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("receiptNumber")).toBe("RCP-000001");
        return HttpResponse.json([us1.completedSale]);
      }),
      http.post("*/api/v1/returns", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toMatchObject({
          originalSaleId: us1.SALE_ID,
          refundTender: "Original",
          lines: [
            {
              saleLineId: us2.SALE_LINE_ID,
              qty: 1,
              disposition: "ToStock",
            },
          ],
        });
        return HttpResponse.json(us2.returnTransaction);
      }),
    );

    const matches = await lookupSales({ receiptNumber: "RCP-000001" });
    expect(matches[0]?.id).toBe(us1.SALE_ID);

    const recorded = await createReturn({
      originalSaleId: us1.SALE_ID,
      refundTender: "Original",
      lines: [{ saleLineId: us2.SALE_LINE_ID, qty: "1", disposition: "ToStock" }],
    });
    expect(recorded.refundTotal).toBe("11.5");
    expect(recorded.lines[0]?.originalUnitPrice).toBe("10");
  });

  it("pauses an above-threshold return until a manager identifier is attached", async () => {
    server.use(
      http.post("*/api/v1/returns", () =>
        HttpResponse.json(us2.approvalRequiredProblem, {
          status: 423,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    const failure = await createReturn({
      originalSaleId: us1.SALE_ID,
      refundTender: "Cash",
      lines: [{ saleLineId: us2.SALE_LINE_ID, qty: "2", disposition: "Quarantine" }],
    }).catch((error: unknown) => error);

    expect(isProblemError(failure)).toBe(true);
    if (isProblemError(failure)) {
      expect(failure.problem.kind).toBe("approvalRequired");
    }
  });

  it("posts an exchange that settles only the server net amount", async () => {
    server.use(
      http.post("*/api/v1/returns/exchange", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toMatchObject({
          originalSaleId: us1.SALE_ID,
          registerId: us1.REGISTER_ID,
          shiftId: us1.SHIFT_ID,
        });
        return HttpResponse.json(us2.exchangeTransaction);
      }),
    );

    const exchanged = await createExchange({
      originalSaleId: us1.SALE_ID,
      registerId: us1.REGISTER_ID,
      shiftId: us1.SHIFT_ID,
      lines: [{ saleLineId: us2.SALE_LINE_ID, qty: "1", disposition: "ToStock" }],
      newLines: [{ productId: us2.OIL_ID, qty: "1" }],
      payments: [{ tender: "Cash", amount: "8.00" }],
    });
    expect(exchanged.exchangeSaleId).toBeTruthy();
    expect(exchanged.refundTotal).toBe("-8");
  });

  it("voids an eligible sale with a reason", async () => {
    server.use(
      http.post(`*/api/v1/sales/${us1.SALE_ID}/void`, async ({ request }) => {
        const body = (await request.json()) as { reason: string };
        expect(body.reason).toBe("Entered on the wrong register");
        return HttpResponse.json(us2.voidedSale);
      }),
    );

    const voided = await voidSale(us1.SALE_ID, "Entered on the wrong register");
    expect(voided.status).toBe("Voided");
  });
});
