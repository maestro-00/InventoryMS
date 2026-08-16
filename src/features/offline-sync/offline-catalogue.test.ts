import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { buildOfflineCatalogue } from "./offline-catalogue";
import {
  openRegisterDatabase,
  partitionKey,
  replaceSnapshotAtomically,
} from "../../shared/db/register-database";

const tenantId = "11111111-1111-4111-8111-111111111111";
const registerId = "22222222-2222-4222-8222-222222222222";
const productId = "44444444-4444-4444-8444-444444444444";

describe("offline catalogue", () => {
  beforeEach(async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await db.delete();
    db.close();
  });

  it("indexes products by barcode and search fields with overlay stock", async () => {
    const db = openRegisterDatabase(tenantId, registerId);
    await replaceSnapshotAtomically(db, {
      meta: {
        id: partitionKey(tenantId, registerId),
        tenantId,
        registerId,
        shiftId: "33333333-3333-4333-8333-333333333333",
        locked: false,
        readinessDeadline: new Date(Date.now() + 60_000).toISOString(),
        watermark: "AAA=",
        bundleVersion: "1",
        preparedAt: new Date().toISOString(),
      },
      products: [
        {
          id: productId,
          name: "Sugar 1kg",
          sku: "SUG",
          barcode: "6001",
          sellingPrice: "10.0000",
          taxTreatmentId: null,
          allowFractional: false,
          trackingMode: "Simple",
          allowsDiscount: true,
          version: "1",
        },
        {
          id: "55555555-5555-4555-8555-555555555555",
          name: "No barcode tea",
          sku: "TEA",
          barcode: null,
          sellingPrice: "5.0000",
          taxTreatmentId: null,
          allowFractional: false,
          trackingMode: "Simple",
          allowsDiscount: true,
          version: "1",
        },
      ],
      stock: [
        {
          id: `${productId}::`,
          productId,
          variantId: null,
          batchId: null,
          qtyOnHand: "10.0000",
          qtyInTransit: "0.0000",
          qtyQuarantine: "0.0000",
          version: "1",
        },
      ],
      taxes: [],
    });
    await db.overlays.put({
      id: "overlay-1",
      clientSaleId: "sale-1",
      productId,
      variantId: null,
      batchId: null,
      qtyDelta: "-2.0000",
      active: true,
    });
    db.close();

    const catalogue = await buildOfflineCatalogue(tenantId, registerId);
    expect(catalogue.items).toHaveLength(2);
    expect(catalogue.byBarcode.get("6001")?.effectiveQty).toBe("8.0000");
    expect(catalogue.byBarcode.has("missing")).toBe(false);
    expect(catalogue.search.search("Sugar")[0]?.id).toBe(productId);
  });
});
