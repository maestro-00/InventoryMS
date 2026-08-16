import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import { prepareRegister } from "../../src/features/offline-sync/prepare-register";
import "fake-indexeddb/auto";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US4_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/sync/snapshot"],
  ["post", "/api/v1/sync/sales"],
  ["get", "/api/v1/sync/conflicts"],
  ["post", "/api/v1/sync/conflicts/{saleId}/resolve"],
  ["get", "/api/v1/sync/rejected"],
  ["post", "/api/v1/sync/rejected/{rejectedSaleId}/resolve"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

describe("US4 provider contract surface", () => {
  it("captures sync readiness operations", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US4_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });
});

describe("offline preparation fixture", () => {
  it("accepts a complete preparation bundle including favourites and fiscal metadata", async () => {
    const registerId = "22222222-2222-4222-8222-222222222222";
    const tenantId = "11111111-1111-4111-8111-111111111111";
    const result = await prepareRegister({
      tenantId,
      registerId,
      shiftId: "33333333-3333-4333-8333-333333333333",
      credentialExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      fetchSnapshot: () =>
        Promise.resolve({
          watermark: "AAA=",
          registerId,
          locationId: "55555555-5555-4555-8555-555555555555",
          bundleVersion: "2026.08.offline-prep.1",
          products: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              name: "Sugar",
              sku: "SUG",
              barcode: "6001",
              sellingPrice: 10,
              taxTreatmentId: null,
              allowFractional: false,
              trackingMode: "Simple",
              allowsDiscount: true,
              version: "1",
            },
          ],
          taxTreatments: [],
          stock: [
            {
              productId: "44444444-4444-4444-8444-444444444444",
              variantId: null,
              batchId: null,
              qtyOnHand: 10,
              qtyInTransit: 0,
              qtyQuarantine: 0,
              version: "1",
            },
          ],
          favourites: { registerId, layoutJson: "{}", version: "1" },
          receiptTemplate: { templateJson: "{}", version: "1" },
          deleted: [],
        }),
    });
    expect(result.productCount).toBe(1);
    expect(Date.parse(result.deadline)).toBeGreaterThan(Date.now());
  });
});

describe("rejected reconciliation fixture", () => {
  it("lists rejected sales for manager review", async () => {
    server.use(
      http.get("*/api/v1/sync/rejected", () =>
        HttpResponse.json([
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            clientSaleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            registerId: "22222222-2222-4222-8222-222222222222",
            rejectionReason: "product missing",
            status: "Open",
            payloadHash: "abc",
          },
        ]),
      ),
    );
    const response = await fetch("http://localhost/api/v1/sync/rejected");
    const body = (await response.json()) as Array<{ status: string }>;
    expect(body[0]?.status).toBe("Open");
  });
});
