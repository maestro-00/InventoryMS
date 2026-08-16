import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../shared/test/msw/server";
import { isProblemError } from "../../../shared/api/errors/problem-error";
import * as us1 from "../../../../tests/fixtures/provider/us1";
import {
  completeSale,
  newClientSaleId,
  onlineSaleSchema,
  SaleSubmissionGuard,
  type OnlineSaleRequest,
} from "./online-checkout";
import { fetchSale, fetchSales, type SaleRecord } from "../sales/api/sales-api";

const request: OnlineSaleRequest = {
  clientSaleId: us1.CLIENT_SALE_ID,
  registerId: us1.REGISTER_ID,
  shiftId: us1.SHIFT_ID,
  lines: [{ productId: us1.PRODUCT_ID, qty: "2" }],
  payments: [{ tender: "Cash", amount: "25.00" }],
};

describe("online sale request", () => {
  it("generates one client sale identity per cart", () => {
    expect(newClientSaleId()).not.toBe(newClientSaleId());
  });

  it("rejects a cart with no lines and a sale with no payment", () => {
    const noLines = onlineSaleSchema.safeParse({ ...request, lines: [] });
    const noPayments = onlineSaleSchema.safeParse({ ...request, payments: [] });

    expect(noLines.success).toBe(false);
    expect(noLines.error?.issues[0]?.message).toBe(
      "Add at least one line before taking payment",
    );
    expect(noPayments.error?.issues[0]?.message).toBe("Record at least one payment");
  });

  it("defaults the status to Completed and preserves decimal strings", () => {
    const parsed = onlineSaleSchema.parse(request);

    expect(parsed.status).toBe("Completed");
    expect(parsed.payments[0]?.amount).toBe("25.00");
    expect(parsed.lines[0]?.qty).toBe("2");
  });

  it("surfaces an RFC 7807 problem when the server rejects the sale", async () => {
    server.use(
      http.post("*/api/v1/sales", () =>
        HttpResponse.json(us1.validationProblem, {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    );

    const failure = await completeSale(request).catch((error: unknown) => error);

    expect(isProblemError(failure)).toBe(true);
  });
});

describe("sale submission guard", () => {
  it("returns the first outcome instead of submitting a repeated payment click", async () => {
    const guard = new SaleSubmissionGuard();
    let submissions = 0;
    server.use(
      http.post("*/api/v1/sales", () => {
        submissions += 1;
        return HttpResponse.json(us1.completedSale);
      }),
    );

    const first = await guard.run(() => completeSale(request));
    const repeat = await guard.run(() => completeSale(request));

    expect(submissions).toBe(1);
    expect(repeat).toBe(first);
    expect(guard.getState()).toBe("completed");
    expect(guard.getResult()?.grandTotal).toBe("23");
    expect(guard.canSubmit()).toBe(false);
  });

  it("refuses a concurrent submission while the first is in flight", async () => {
    const guard = new SaleSubmissionGuard();
    let release: (sale: SaleRecord) => void = () => undefined;
    const pending = new Promise<SaleRecord>((resolve) => {
      release = resolve;
    });

    const inFlight = guard.run(() => pending);
    expect(guard.getState()).toBe("submitting");

    const rejected = await guard.run(() => pending).catch((error: unknown) => error);
    expect(rejected).toBeInstanceOf(Error);
    expect((rejected as Error).message).toBe(
      "A sale completion is already in progress",
    );

    release(us1.completedSale as unknown as SaleRecord);
    await inFlight;
    expect(guard.getState()).toBe("completed");
  });

  it("allows a retry after a failed submission and clears on reset", async () => {
    const guard = new SaleSubmissionGuard();

    const failure = await guard
      .run(() => Promise.reject(new Error("network down")))
      .catch((error: unknown) => error);

    expect((failure as Error).message).toBe("network down");
    expect(guard.getState()).toBe("idle");
    expect(guard.canSubmit()).toBe(true);

    guard.reset();
    expect(guard.getResult()).toBeNull();
  });
});

describe("sale history queries", () => {
  it("clamps the page size and forwards the scope filters", async () => {
    let query = new URLSearchParams();
    server.use(
      http.get("*/api/v1/sales", ({ request: received }) => {
        query = new URL(received.url).searchParams;
        return HttpResponse.json({
          items: [us1.completedSale],
          page: 1,
          pageSize: 200,
          totalCount: 1,
        });
      }),
    );

    const history = await fetchSales({
      page: 0,
      pageSize: 5000,
      locationId: us1.LOCATION_ID,
      registerId: us1.REGISTER_ID,
      status: "Completed",
    });

    expect(query.get("page")).toBe("1");
    expect(Number(query.get("pageSize"))).toBeLessThanOrEqual(200);
    expect(query.get("locationId")).toBe(us1.LOCATION_ID);
    expect(query.get("registerId")).toBe(us1.REGISTER_ID);
    expect(query.get("status")).toBe("Completed");
    expect(history.items[0]?.grandTotal).toBe("23");
  });

  it("omits absent filters and reads a single sale", async () => {
    let query = new URLSearchParams();
    server.use(
      http.get("*/api/v1/sales", ({ request: received }) => {
        query = new URL(received.url).searchParams;
        return HttpResponse.json({
          items: [],
          page: 1,
          pageSize: 50,
          totalCount: 0,
        });
      }),
      http.get(`*/api/v1/sales/${us1.SALE_ID}`, () =>
        HttpResponse.json(us1.completedSale),
      ),
    );

    await fetchSales();

    expect(query.has("locationId")).toBe(false);
    expect(query.has("status")).toBe(false);
    expect((await fetchSale(us1.SALE_ID)).status).toBe("Completed");
  });
});
