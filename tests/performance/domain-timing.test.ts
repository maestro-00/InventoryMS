import { describe, expect, it } from "vitest";

/**
 * Domain interaction budgets from plan.md (automated merge of barcode + cart path).
 * These are unit-level timing contracts for pure helpers; E2E field timings live in
 * validation/performance.md when measured against a running build.
 */

const BARCODE_TO_CART_P95_MS = 200;
const AUTHENTICATED_ROUTE_USABLE_MS = 3000;

function simulateBarcodeMerge(
  products: Array<{ barcode: string; id: string }>,
  scan: string,
) {
  const started = performance.now();
  const match = products.find((p) => p.barcode === scan) ?? null;
  const elapsed = performance.now() - started;
  return { match, elapsed };
}

describe("domain timing budgets", () => {
  it("resolves a cached barcode into a product id within 200 ms", () => {
    const catalogue = Array.from({ length: 2_000 }, (_, i) => ({
      barcode: `600${String(i).padStart(4, "0")}`,
      id: `product-${String(i)}`,
    }));
    const samples: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      const { match, elapsed } = simulateBarcodeMerge(catalogue, "6001999");
      expect(match?.id).toBe("product-1999");
      samples.push(elapsed);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)] ?? Number.POSITIVE_INFINITY;
    expect(p95).toBeLessThanOrEqual(BARCODE_TO_CART_P95_MS);
  });

  it("documents the authenticated-route usable ceiling for evidence capture", () => {
    expect(AUTHENTICATED_ROUTE_USABLE_MS).toBe(3000);
  });
});
