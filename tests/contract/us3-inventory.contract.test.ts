import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import {
  fetchStockLevels,
  fetchStockMovements,
  correctMovement,
} from "../../src/features/inventory/stock/api/stock-api";
import {
  approveAdjustment,
  fetchAdjustmentReasons,
  recordAdjustment,
  recordConsumption,
  rejectAdjustment,
} from "../../src/features/inventory/adjustments/api/adjustments-api";
import {
  createTransfer,
  dispatchTransfer,
  fetchTransfer,
  receiveTransfer,
} from "../../src/features/inventory/transfers/api/transfers-api";
import {
  approveStockCount,
  openStockCount,
  submitStockCount,
  updateCountLines,
} from "../../src/features/inventory/counts/api/counts-api";
import {
  fetchAlerts,
  fetchReorderSuggestions,
} from "../../src/features/inventory/alerts/api/alerts-api";
import * as us1 from "../fixtures/provider/us1";
import * as us3 from "../fixtures/provider/us3";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US3_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/stock"],
  ["get", "/api/v1/stock/movements"],
  ["post", "/api/v1/stock/movements/{id}/correct"],
  ["post", "/api/v1/stock/adjustments"],
  ["post", "/api/v1/stock/adjustments/{id}/approve"],
  ["post", "/api/v1/stock/adjustments/{id}/reject"],
  ["get", "/api/v1/stock/adjustment-reasons"],
  ["post", "/api/v1/stock/consumption"],
  ["post", "/api/v1/transfers"],
  ["post", "/api/v1/transfers/{id}/dispatch"],
  ["post", "/api/v1/transfers/{id}/receive"],
  ["post", "/api/v1/counts"],
  ["get", "/api/v1/counts/{id}"],
  ["put", "/api/v1/counts/{id}/lines"],
  ["post", "/api/v1/counts/{id}/submit"],
  ["post", "/api/v1/counts/{id}/approve"],
  ["post", "/api/v1/counts/{id}/reject"],
  ["get", "/api/v1/alerts"],
  ["get", "/api/v1/reorder/suggestions"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

describe("US3 provider contract surface", () => {
  it("captures every operation the stock-control journey consumes", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US3_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(
        doc.paths[path]?.[method],
        `missing ${method.toUpperCase()} ${path}`,
      ).toBeDefined();
    }
  });
});

describe("stock and movements", () => {
  it("pages location stock and preserves avgUnitCost when present", async () => {
    server.use(
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [us3.stockAtA],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );
    const page = await fetchStockLevels({ locationId: us1.LOCATION_ID });
    expect(page.items[0]?.avgUnitCost).toBe("6");
  });

  it("returns a business-wide rollup without inventing cost", async () => {
    server.use(
      http.get("*/api/v1/stock", () =>
        HttpResponse.json({
          items: [us3.stockRollup],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
    );
    const page = await fetchStockLevels({ groupBy: "product" });
    expect(page.items[0]?.locationId).toBeNull();
    expect(page.items[0]?.avgUnitCost).toBeNull();
  });

  it("lists movements and posts a correction that keeps the original identity", async () => {
    server.use(
      http.get("*/api/v1/stock/movements", () =>
        HttpResponse.json({
          items: [us3.movementRecord],
          page: 1,
          pageSize: 50,
          totalCount: 1,
        }),
      ),
      http.post(`*/api/v1/stock/movements/${us3.MOVEMENT_ID}/correct`, () =>
        HttpResponse.json(us3.correctionMovement),
      ),
    );
    const page = await fetchStockMovements({ locationId: us1.LOCATION_ID });
    expect(page.items[0]?.id).toBe(us3.MOVEMENT_ID);
    const correction = await correctMovement(us3.MOVEMENT_ID, {
      correctedQtyDelta: "8",
      reasonCode: "Correction",
      note: "Counted over",
    });
    expect(correction.correlationId).toBe(us3.MOVEMENT_ID);
  });
});

describe("adjustments, consumption, transfers, counts", () => {
  it("records, approves, and rejects adjustments and consumption", async () => {
    server.use(
      http.get("*/api/v1/stock/adjustment-reasons", () =>
        HttpResponse.json(us3.adjustmentReasons),
      ),
      http.post("*/api/v1/stock/adjustments", () =>
        HttpResponse.json(us3.pendingAdjustment),
      ),
      http.post(`*/api/v1/stock/adjustments/${us3.ADJUSTMENT_ID}/approve`, () =>
        HttpResponse.json(us3.appliedAdjustment),
      ),
      http.post(`*/api/v1/stock/adjustments/${us3.ADJUSTMENT_ID}/reject`, () =>
        HttpResponse.json({ status: "Rejected", movementProductIds: [] }),
      ),
      http.post("*/api/v1/stock/consumption", () =>
        HttpResponse.json(us3.appliedAdjustment),
      ),
    );
    expect((await fetchAdjustmentReasons())[0]?.code).toBe("Correction");
    expect(
      (
        await recordAdjustment({
          locationId: us1.LOCATION_ID,
          reasonCode: "Damage",
          lines: [{ productId: us1.PRODUCT_ID, qtyDelta: "-50" }],
        })
      ).status,
    ).toBe("PendingApproval");
    expect((await approveAdjustment(us3.ADJUSTMENT_ID)).status).toBe("Applied");
    expect((await rejectAdjustment(us3.ADJUSTMENT_ID)).status).toBe("Rejected");
    expect(
      (
        await recordConsumption({
          locationId: us1.LOCATION_ID,
          reasonCode: "PersonalUse",
          lines: [{ productId: us1.PRODUCT_ID, qtyDelta: "-1" }],
        })
      ).status,
    ).toBe("Applied");
  });

  it("creates, dispatches, and receives a transfer with discrepancy", async () => {
    server.use(
      http.post("*/api/v1/transfers", () =>
        HttpResponse.json(
          { id: us3.TRANSFER_ID, status: "Draft", discrepancyReason: null },
          { status: 201 },
        ),
      ),
      http.get(`*/api/v1/transfers/${us3.TRANSFER_ID}`, () =>
        HttpResponse.json(us3.transferDraft),
      ),
      http.post(`*/api/v1/transfers/${us3.TRANSFER_ID}/dispatch`, () =>
        HttpResponse.json({ id: us3.TRANSFER_ID, status: "Dispatched" }),
      ),
      http.post(`*/api/v1/transfers/${us3.TRANSFER_ID}/receive`, () =>
        HttpResponse.json({
          id: us3.TRANSFER_ID,
          status: "ReceivedWithDiscrepancy",
          discrepancyReason: "Two bags damaged in transit",
        }),
      ),
    );
    const created = await createTransfer({
      fromLocationId: us1.LOCATION_ID,
      toLocationId: us3.LOCATION_B_ID,
      lines: [{ productId: us1.PRODUCT_ID, quantity: "10" }],
    });
    expect(created.lines).toHaveLength(1);
    server.use(
      http.get(`*/api/v1/transfers/${us3.TRANSFER_ID}`, () =>
        HttpResponse.json(us3.transferDispatched),
      ),
    );
    expect((await dispatchTransfer(us3.TRANSFER_ID)).status).toBe("Dispatched");
    server.use(
      http.get(`*/api/v1/transfers/${us3.TRANSFER_ID}`, () =>
        HttpResponse.json(us3.transferReceived),
      ),
    );
    const received = await receiveTransfer(us3.TRANSFER_ID, {
      lines: [{ lineId: us3.TRANSFER_LINE_ID, quantityReceived: "8" }],
      discrepancyReason: "Two bags damaged in transit",
    });
    expect(received.status).toBe("ReceivedWithDiscrepancy");
    expect((await fetchTransfer(us3.TRANSFER_ID)).discrepancyReason).toMatch(
      /damaged/i,
    );
  });

  it("opens, updates, submits, and approves a spot count", async () => {
    server.use(
      http.post("*/api/v1/counts", () =>
        HttpResponse.json(us3.openCount, {
          status: 201,
          headers: { ETag: '"count-1"' },
        }),
      ),
      http.put(`*/api/v1/counts/${us3.COUNT_ID}/lines`, () =>
        HttpResponse.json(us3.submittedCount, {
          headers: { ETag: '"count-2"' },
        }),
      ),
      http.post(`*/api/v1/counts/${us3.COUNT_ID}/submit`, () =>
        HttpResponse.json(us3.submittedCount),
      ),
      http.post(`*/api/v1/counts/${us3.COUNT_ID}/approve`, () =>
        HttpResponse.json(us3.approvedCount),
      ),
    );
    const opened = await openStockCount({
      locationId: us1.LOCATION_ID,
      scope: "Spot",
      productIds: [us1.PRODUCT_ID],
    });
    expect(opened.etag).toBe('"count-1"');
    const lined = await updateCountLines(
      us3.COUNT_ID,
      { lines: [{ lineId: us3.COUNT_LINE_ID, countedQty: "7" }] },
      opened.etag,
    );
    expect(lined.count.lines[0]?.varianceQty).toBe("-1");
    expect((await submitStockCount(us3.COUNT_ID, lined.etag)).status).toBe("Submitted");
    expect((await approveStockCount(us3.COUNT_ID)).status).toBe("Approved");
  });
});

describe("alerts and reorder suggestions", () => {
  it("lists alerts and supplier-grouped reorder suggestions", async () => {
    server.use(
      http.get("*/api/v1/alerts", () => HttpResponse.json(us3.alerts)),
      http.get("*/api/v1/reorder/suggestions", () =>
        HttpResponse.json(us3.reorderSuggestions),
      ),
    );
    expect((await fetchAlerts())[0]?.type).toBe("LowStock");
    expect((await fetchReorderSuggestions(us1.LOCATION_ID))[0]?.supplierName).toBe(
      "Tema Wholesale",
    );
  });
});
