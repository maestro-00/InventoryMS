import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import { isProblemError } from "../../src/shared/api/errors/problem-error";
import {
  login,
  registerTenant,
  verifyTwoFactor,
} from "../../src/features/auth/api/auth-api";
import {
  fetchTenant,
  loadSampleData,
  removeSampleData,
  updateTenant,
} from "../../src/features/tenant/api/tenant-api";
import {
  createLocation,
  fetchLocations,
} from "../../src/features/inventory/locations/api/locations-api";
import {
  createProduct,
  fetchProduct,
  fetchProducts,
  fetchTaxTreatments,
} from "../../src/features/catalogue/products/api/products-api";
import {
  abandonImport,
  commitImport,
  setImportMapping,
  uploadProductImport,
} from "../../src/features/catalogue/import/api/import-api";
import {
  fetchStock,
  recordOpeningStock,
} from "../../src/features/inventory/opening-stock/api/opening-stock-api";
import {
  createRegister,
  fetchRegisters,
  openShift,
} from "../../src/features/registers/registers/api/registers-api";
import { completeSale } from "../../src/features/pos/checkout/online-checkout";
import { fetchSale, fetchSales } from "../../src/features/pos/sales/api/sales-api";
import {
  fetchReceipt,
  fetchReceiptTemplate,
  saveReceiptTemplate,
} from "../../src/features/pos/receipts/api/receipts-api";
import * as us1 from "../fixtures/provider/us1";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US1_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["post", "/api/v1/auth/register"],
  ["post", "/api/v1/auth/login"],
  ["post", "/api/v1/auth/refresh"],
  ["post", "/api/v1/auth/google"],
  ["post", "/api/v1/auth/2fa/verify"],
  ["get", "/api/v1/tenant"],
  ["patch", "/api/v1/tenant"],
  ["post", "/api/v1/tenant/sample-data"],
  ["delete", "/api/v1/tenant/sample-data"],
  ["get", "/api/v1/tenant/receipt-template"],
  ["put", "/api/v1/tenant/receipt-template"],
  ["get", "/api/v1/locations"],
  ["post", "/api/v1/locations"],
  ["patch", "/api/v1/locations/{id}"],
  ["get", "/api/v1/categories"],
  ["post", "/api/v1/categories"],
  ["patch", "/api/v1/categories/{id}"],
  ["delete", "/api/v1/categories/{id}"],
  ["get", "/api/v1/products"],
  ["post", "/api/v1/products"],
  ["get", "/api/v1/products/{id}"],
  ["get", "/api/v1/tax-treatments"],
  ["post", "/api/v1/import/products"],
  ["post", "/api/v1/import/opening-stock"],
  ["put", "/api/v1/import/products/{jobId}/mapping"],
  ["post", "/api/v1/import/products/{jobId}/commit"],
  ["delete", "/api/v1/import/products/{jobId}"],
  ["post", "/api/v1/stock/adjustments"],
  ["get", "/api/v1/stock"],
  ["get", "/api/v1/registers"],
  ["post", "/api/v1/registers"],
  ["post", "/api/v1/registers/{registerId}/shifts"],
  ["post", "/api/v1/sales"],
  ["get", "/api/v1/sales"],
  ["get", "/api/v1/sales/{id}"],
  ["get", "/api/v1/sales/{id}/receipt"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

describe("US1 provider contract surface", () => {
  it("captures every operation the first-sale journey consumes", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US1_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(
        doc.paths[path]?.[method],
        `missing ${method.toUpperCase()} ${path}`,
      ).toBeDefined();
    }
  });
});

describe("US1 authentication contract", () => {
  it("creates a business and returns the trial subscription with session tokens", async () => {
    server.use(
      http.post("*/api/v1/auth/register", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toMatchObject({
          email: "owner@kwame.gh",
          businessName: "Kwame Provisions",
          country: "GH",
          currency: "GHS",
          businessType: "Retail",
        });
        return HttpResponse.json(us1.registerTenantResult, { status: 201 });
      }),
    );

    const result = await registerTenant({
      email: "owner@kwame.gh",
      password: "Str0ng-Passphrase!",
      businessName: "Kwame Provisions",
      country: "GH",
      currency: "GHS",
      businessType: "Retail",
    });

    expect(result.tenantId).toBe(us1.TENANT_ID);
    expect(result.subscriptionStatus).toBe("Trialing");
    expect(result.accessToken).toBe("provider-access-token");
  });

  it("reports a two-factor challenge from the 423 login response", async () => {
    server.use(
      http.post("*/api/v1/auth/login", () =>
        HttpResponse.json(us1.twoFactorRequiredProblem, {
          status: 423,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    const outcome = await login({
      email: "owner@kwame.gh",
      password: "Str0ng-Passphrase!",
    });

    expect(outcome.requiresTwoFactor).toBe(true);
    expect(outcome.accessToken).toBeUndefined();
  });

  it("completes the two-factor challenge", async () => {
    server.use(
      http.post("*/api/v1/auth/2fa/verify", async ({ request }) => {
        expect(await request.json()).toEqual({ code: "123456" });
        return HttpResponse.json({ enabled: true });
      }),
    );

    await expect(verifyTwoFactor("123456")).resolves.toBeUndefined();
  });
});

describe("US1 tenant contract", () => {
  it("reads the tenant profile, checklist, and thresholds as decimal strings", async () => {
    server.use(
      http.get("*/api/v1/tenant", () =>
        HttpResponse.json(us1.tenantProfile, { headers: { ETag: 'W/"tenant-1"' } }),
      ),
    );

    const { tenant, etag } = await fetchTenant();

    expect(etag).toBe('W/"tenant-1"');
    expect(tenant.currency).toBe("GHS");
    expect(tenant.adjustmentApprovalThreshold).toBe("250");
    expect(tenant.onboardingChecklist).toEqual({ location: true, product: false });
  });

  it("sends If-Match when updating the tenant", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.patch("*/api/v1/tenant", ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return HttpResponse.json(us1.tenantProfile);
      }),
    );

    await updateTenant({ name: "Kwame Provisions" }, 'W/"tenant-1"');

    expect(ifMatch).toBe('W/"tenant-1"');
  });

  it("loads and removes sample data through dedicated operations", async () => {
    const calls: string[] = [];
    server.use(
      http.post("*/api/v1/tenant/sample-data", () => {
        calls.push("post");
        return new HttpResponse(null, { status: 204 });
      }),
      http.delete("*/api/v1/tenant/sample-data", () => {
        calls.push("delete");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await loadSampleData();
    await removeSampleData();

    expect(calls).toEqual(["post", "delete"]);
  });
});

describe("US1 location contract", () => {
  it("lists and creates locations", async () => {
    server.use(
      http.get("*/api/v1/locations", () => HttpResponse.json([us1.locationRecord])),
      http.post("*/api/v1/locations", async ({ request }) => {
        expect(await request.json()).toMatchObject({ name: "Main Shop", kind: "Shop" });
        return HttpResponse.json(us1.locationRecord, { status: 201 });
      }),
    );

    expect(await fetchLocations()).toHaveLength(1);
    const created = await createLocation({ name: "Main Shop", kind: "Shop" });
    expect(created.id).toBe(us1.LOCATION_ID);
  });
});

describe("US1 catalogue contract", () => {
  it("requests a page size within the documented maximum and preserves decimals", async () => {
    let requestedPageSize = "";
    server.use(
      http.get("*/api/v1/products", ({ request }) => {
        requestedPageSize =
          new URL(request.url).searchParams.get("pageSize") ?? "missing";
        return HttpResponse.json(us1.pagedProducts);
      }),
    );

    const page = await fetchProducts({ page: 1, pageSize: 500 });

    expect(Number(requestedPageSize)).toBeLessThanOrEqual(200);
    expect(page.items[0]?.sellingPrice).toBe("10");
    expect(page.totalCount).toBe(1);
  });

  it("reads a single product with its ETag", async () => {
    server.use(
      http.get(`*/api/v1/products/${us1.PRODUCT_ID}`, () =>
        HttpResponse.json(us1.productRecord, { headers: { ETag: 'W/"product-1"' } }),
      ),
    );

    const { product, etag } = await fetchProduct(us1.PRODUCT_ID);

    expect(product.sku).toBe("SUG-001");
    expect(etag).toBe('W/"product-1"');
  });

  it("creates a product and surfaces RFC 7807 field errors", async () => {
    server.use(
      http.post("*/api/v1/products", () =>
        HttpResponse.json(us1.validationProblem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    const failure = await createProduct({
      name: "Sugar 1kg",
      sku: "SUG-001",
      sellingPrice: "10.00",
      costPrice: "6.00",
      trackingMode: "Simple",
      unitOfMeasure: "Each",
      allowFractional: false,
    }).catch((error: unknown) => error);

    expect(isProblemError(failure)).toBe(true);
    if (!isProblemError(failure)) return;
    expect(failure.problem.kind).toBe("validation");
    expect(failure.problem.fieldErrors["sku"]).toEqual([
      "SKU must be unique within the tenant.",
    ]);
    expect(failure.problem.traceId).toBe(us1.validationProblem.traceId);
  });

  it("lists Ghana tax treatments", async () => {
    server.use(
      http.get("*/api/v1/tax-treatments", () => HttpResponse.json(us1.taxTreatments)),
    );

    const treatments = await fetchTaxTreatments();

    expect(treatments[0]?.code).toBe("GH-STD");
  });
});

describe("US1 import contract", () => {
  it("uploads, maps, previews, commits, and abandons an import job", async () => {
    let abandoned = false;
    server.use(
      http.post("*/api/v1/import/products", () =>
        HttpResponse.json(us1.importJobUploaded, { status: 201 }),
      ),
      http.put(`*/api/v1/import/products/${us1.IMPORT_JOB_ID}/mapping`, () =>
        HttpResponse.json(us1.importJobPreviewed),
      ),
      http.post(`*/api/v1/import/products/${us1.IMPORT_JOB_ID}/commit`, () =>
        HttpResponse.json(us1.importJobCommitted),
      ),
      http.delete(`*/api/v1/import/products/${us1.IMPORT_JOB_ID}`, () => {
        abandoned = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const file = new File(["Name,SKU,Price\n"], "products.csv", { type: "text/csv" });
    const uploaded = await uploadProductImport(file);
    expect(uploaded.detectedColumns).toEqual(["Name", "SKU", "Price"]);

    const mapped = await setImportMapping(uploaded.id, { Name: "Name", SKU: "Sku" });
    expect(mapped.preview).toHaveLength(2);
    expect(mapped.preview?.[1]?.errors).toEqual([
      "SellingPrice must be a decimal value.",
    ]);

    const committed = await commitImport(uploaded.id);
    expect(committed.createdCount).toBe(1);
    expect(committed.skippedCount).toBe(1);

    await abandonImport(uploaded.id);
    expect(abandoned).toBe(true);
  });
});

describe("US1 opening-stock contract", () => {
  it("records opening stock as a reasoned adjustment and reads the level back", async () => {
    server.use(
      http.post("*/api/v1/stock/adjustments", async ({ request }) => {
        expect(await request.json()).toMatchObject({
          locationId: us1.LOCATION_ID,
          reasonCode: "Correction",
          lines: [{ productId: us1.PRODUCT_ID, qtyDelta: 10 }],
        });
        return HttpResponse.json(us1.adjustmentResult);
      }),
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [us1.stockLevel],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );

    const outcome = await recordOpeningStock({
      locationId: us1.LOCATION_ID,
      lines: [{ productId: us1.PRODUCT_ID, qtyDelta: "10" }],
    });
    expect(outcome.status).toBe("Applied");

    const stock = await fetchStock({ locationId: us1.LOCATION_ID });
    expect(stock.items[0]?.qtyOnHand).toBe("10");
    expect(stock.items[0]?.avgUnitCost).toBe("6");
  });
});

describe("US1 register and shift contract", () => {
  it("creates a register and opens a shift with a counted float", async () => {
    server.use(
      http.get("*/api/v1/registers", () => HttpResponse.json([us1.registerRecord])),
      http.post("*/api/v1/registers", () =>
        HttpResponse.json(us1.registerRecord, { status: 201 }),
      ),
      http.post(`*/api/v1/registers/${us1.REGISTER_ID}/shifts`, async ({ request }) => {
        expect(await request.json()).toMatchObject({ openingFloat: 100 });
        return HttpResponse.json(us1.shiftRecord);
      }),
    );

    expect(await fetchRegisters()).toHaveLength(1);
    const register = await createRegister({
      locationId: us1.LOCATION_ID,
      name: "Counter 1",
    });
    const shift = await openShift({
      registerId: register.id,
      openingFloat: "100.00",
    });

    expect(shift.status).toBe("Open");
    expect(shift.openingFloat).toBe("100");
  });
});

describe("US1 sale and receipt contract", () => {
  const saleRequest = {
    clientSaleId: us1.CLIENT_SALE_ID,
    registerId: us1.REGISTER_ID,
    shiftId: us1.SHIFT_ID,
    lines: [{ productId: us1.PRODUCT_ID, qty: "2" }],
    payments: [{ tender: "Cash" as const, amount: "25.00" }],
  };

  it("submits one stable client sale identity and keeps server totals", async () => {
    const submitted: string[] = [];
    server.use(
      http.post("*/api/v1/sales", async ({ request }) => {
        const body = (await request.json()) as { clientSaleId: string };
        submitted.push(body.clientSaleId);
        return HttpResponse.json(us1.completedSale);
      }),
    );

    const first = await completeSale(saleRequest);
    const retry = await completeSale(saleRequest);

    expect(submitted).toEqual([us1.CLIENT_SALE_ID, us1.CLIENT_SALE_ID]);
    expect(first.grandTotal).toBe("23");
    expect(first.changeDue).toBe("2");
    expect(first.lines[0]?.qty).toBe("2");
    expect(retry.id).toBe(first.id);
  });

  it("lists sale history and reads one sale", async () => {
    server.use(
      http.get("*/api/v1/sales", () =>
        HttpResponse.json({
          items: [us1.completedSale],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.get(`*/api/v1/sales/${us1.SALE_ID}`, () =>
        HttpResponse.json(us1.completedSale),
      ),
    );

    const history = await fetchSales({ page: 1, pageSize: 50 });
    expect(history.items).toHaveLength(1);

    const sale = await fetchSale(us1.SALE_ID);
    expect(sale.status).toBe("Completed");
  });

  it("reads the final receipt and the receipt template", async () => {
    let ifMatch: string | null = null;
    server.use(
      http.get(`*/api/v1/sales/${us1.SALE_ID}/receipt`, () =>
        HttpResponse.json(us1.receiptRecord),
      ),
      http.get("*/api/v1/tenant/receipt-template", () =>
        HttpResponse.json(us1.receiptTemplate, {
          headers: { ETag: 'W/"template-1"' },
        }),
      ),
      http.put("*/api/v1/tenant/receipt-template", ({ request }) => {
        ifMatch = request.headers.get("If-Match");
        return HttpResponse.json(us1.receiptTemplate);
      }),
    );

    const receipt = await fetchReceipt(us1.SALE_ID);
    expect(receipt.number).toBe("RCP-000001");

    const { template, etag } = await fetchReceiptTemplate();
    expect(template.businessName).toBe("Kwame Provisions");
    expect(etag).toBe('W/"template-1"');

    await saveReceiptTemplate(template, etag);
    expect(ifMatch).toBe('W/"template-1"');
  });
});
