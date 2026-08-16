import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import {
  fetchBatchTrace,
  fetchProductBatches,
  filterBatchesByExpiryHorizon,
} from "../../src/features/inventory/batches/api/batches-api";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";
const PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
const BATCH_ID = "d1111111-1111-4111-8111-111111111111";

describe("US10 provider contract surface", () => {
  it("captures product batches and batch trace operations", () => {
    const doc = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as {
      paths: Record<string, Record<string, unknown>>;
    };
    expect(doc.paths["/api/v1/products/{id}/batches"]?.get).toBeDefined();
    expect(doc.paths["/api/v1/batches/{id}/trace"]?.get).toBeDefined();
  });
});

describe("batch API contracts", () => {
  it("lists FEFO batches and returns recall trace", async () => {
    server.use(
      http.get("*/api/v1/products/:id/batches", () =>
        HttpResponse.json([
          {
            id: BATCH_ID,
            batchNumber: "BATCH-1",
            qty: 8,
            expiresAt: "2026-08-20T00:00:00.000Z",
            damagedQty: 1,
          },
        ]),
      ),
      http.get("*/api/v1/batches/:id/trace", () =>
        HttpResponse.json({
          batchId: BATCH_ID,
          batchNumber: "BATCH-1",
          productId: PRODUCT_ID,
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
    const batches = await fetchProductBatches(PRODUCT_ID);
    expect(batches[0]?.batchNumber).toBe("BATCH-1");
    expect(
      filterBatchesByExpiryHorizon(batches, 30, new Date("2026-08-13T00:00:00.000Z")),
    ).toHaveLength(1);
    const trace = await fetchBatchTrace(BATCH_ID);
    expect(trace.supplier?.name).toBe("Tema Wholesale");
    expect(trace.sales).toHaveLength(1);
  });
});
