import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import "fake-indexeddb/auto";
import { server } from "../../shared/test/msw/server";
import { sessionManager } from "../../shared/auth/session-manager";
import { ownerSession } from "../../../tests/fixtures/provider/session";
import { prepareRegister } from "./prepare-register";

const registerId = "22222222-2222-4222-8222-222222222222";
const tenantId = "11111111-1111-4111-8111-111111111111";
const locationId = "55555555-5555-4555-8555-555555555555";
const productId = "44444444-4444-4444-8444-444444444444";
const taxId = "66666666-6666-4666-8666-666666666666";
const variantId = "77777777-7777-4777-8777-777777777777";
const batchId = "88888888-8888-4888-8888-888888888888";

function snapshotBody(overrides: Record<string, unknown> = {}) {
  return {
    watermark: "BBB=",
    registerId,
    locationId,
    bundleVersion: "2026.08.prep.2",
    products: [
      {
        id: productId,
        name: "Sugar",
        sellingPrice: "12.5000",
        allowFractional: true,
        trackingMode: "Batch",
        version: "2",
      },
    ],
    variants: [{ id: variantId }],
    taxTreatments: [
      {
        id: taxId,
        code: "VAT",
        name: "VAT 15%",
        componentsJson: "[]",
        version: "1",
      },
    ],
    stock: [
      {
        productId,
        variantId,
        batchId,
        qtyOnHand: "3.5",
        qtyInTransit: "0",
        qtyQuarantine: "0",
        version: "2",
      },
    ],
    favourites: null,
    receiptTemplate: null,
    deleted: [
      {
        entityType: "Product",
        id: "99999999-9999-4999-8999-999999999999",
        version: "9",
      },
    ],
    ...overrides,
  };
}

describe("prepareRegister", () => {
  it("loads the live snapshot endpoint and maps optional fields", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/sync/snapshot", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("registerId")).toBe(registerId);
        return HttpResponse.json(snapshotBody());
      }),
    );

    const result = await prepareRegister({
      tenantId,
      registerId,
      shiftId: "33333333-3333-4333-8333-333333333333",
      credentialExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      authorizedAt: "2026-08-13T12:00:00.000Z",
    });

    expect(result.productCount).toBe(1);
    expect(result.deadline).toBeTruthy();
  });

  it("fails when the snapshot endpoint rejects the request", async () => {
    sessionManager.setSession({
      ...ownerSession,
      locationScope: [...ownerSession.locationScope],
      accessToken: "access",
      refreshToken: "refresh",
    });
    server.use(
      http.get("*/api/v1/sync/snapshot", () =>
        HttpResponse.json({ title: "busy" }, { status: 503 }),
      ),
    );

    await expect(
      prepareRegister({
        tenantId,
        registerId,
        shiftId: "33333333-3333-4333-8333-333333333333",
        credentialExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ).rejects.toThrow(/Snapshot preparation failed/);
  });

  it("accepts an injected snapshot with numeric prices", async () => {
    const result = await prepareRegister({
      tenantId,
      registerId,
      shiftId: "33333333-3333-4333-8333-333333333333",
      credentialExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      fetchSnapshot: () =>
        Promise.resolve(
          snapshotBody({
            products: [
              {
                id: productId,
                name: "Sugar",
                sku: null,
                barcode: null,
                sellingPrice: 9,
                taxTreatmentId: taxId,
                allowFractional: false,
                trackingMode: "Simple",
                version: "3",
              },
            ],
            stock: [
              {
                productId,
                qtyOnHand: 1,
                qtyInTransit: 2,
                qtyQuarantine: 0,
                version: "3",
              },
            ],
          }),
        ),
    });
    expect(result.productCount).toBe(1);
  });
});

describe("prepareRegister injected failures", () => {
  it("propagates fetchSnapshot errors", async () => {
    await expect(
      prepareRegister({
        tenantId,
        registerId,
        shiftId: "33333333-3333-4333-8333-333333333333",
        credentialExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        fetchSnapshot: () => Promise.reject(new Error("offline")),
      }),
    ).rejects.toThrow(/offline/);
  });

  it("does not call the default path when fetchSnapshot is provided", async () => {
    const fetchSnapshot = vi.fn(() => Promise.resolve(snapshotBody()));
    await prepareRegister({
      tenantId,
      registerId,
      shiftId: "33333333-3333-4333-8333-333333333333",
      credentialExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      fetchSnapshot,
    });
    expect(fetchSnapshot).toHaveBeenCalledOnce();
  });
});
