import { describe, expect, it } from "vitest";
import {
  classifySyncFailure,
  nextBackoffMs,
  toProviderIngestSale,
} from "./sync-coordinator";

describe("sync coordinator", () => {
  it("classifies auth and retry outcomes", () => {
    expect(classifySyncFailure(401)).toBe("auth");
    expect(classifySyncFailure(403)).toBe("auth");
    expect(classifySyncFailure(429)).toBe("retry");
    expect(classifySyncFailure(503)).toBe("retry");
    expect(classifySyncFailure(400)).toBe("stop");
  });

  it("maps local envelopes onto the provider fiscal ingest contract", () => {
    const mapped = toProviderIngestSale(
      {
        clientSaleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        registerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        shiftId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        occurredAt: "2026-08-14T00:00:00.000Z",
        lines: [
          {
            productId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            qty: "2",
            unitPrice: "10.00",
            taxComponentsJson: "[]",
          },
        ],
        payments: [{ tender: "Cash", amount: "20.00" }],
      },
      "abc123",
    );
    expect(mapped.acceptHistoricalFiscalSnapshot).toBe(true);
    expect(mapped.offlineOrigin).toBe(true);
    expect(
      (mapped.lines as Array<{ unitPrice: number; fiscalEvidenceHash: string }>)[0],
    ).toMatchObject({
      unitPrice: 10,
      fiscalEvidenceHash: "abc123",
    });
  });

  it("honors retry-after and bounds backoff", () => {
    expect(nextBackoffMs(0, 2)).toBe(2000);
    expect(nextBackoffMs(10)).toBeLessThanOrEqual(30_250);
  });
});
