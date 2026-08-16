import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../src/shared/test/msw/server";
import {
  fetchInvoices,
  fetchPlans,
  fetchSubscription,
} from "../../src/features/billing/api/billing-queries";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US5_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/billing/plans"],
  ["get", "/api/v1/billing/subscription"],
  ["post", "/api/v1/billing/subscription/upgrade"],
  ["post", "/api/v1/billing/subscription/downgrade"],
  ["post", "/api/v1/billing/subscription/cancel"],
  ["post", "/api/v1/billing/subscription/reactivate"],
  ["post", "/api/v1/billing/payment-method"],
  ["get", "/api/v1/billing/invoices"],
  ["get", "/api/v1/billing/invoices/{id}/pdf"],
  ["patch", "/api/v1/billing/contact"],
  ["post", "/api/v1/tenant/export"],
  ["get", "/api/v1/tenant/export/{jobId}"],
];

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

function loadSnapshot(): OpenApiDocument {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

describe("US5 provider contract surface", () => {
  it("captures billing and export operations", () => {
    const doc = loadSnapshot();
    for (const [method, path] of US5_OPERATIONS) {
      expect(doc.paths[path], `missing path ${path}`).toBeDefined();
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });
});

describe("billing queries", () => {
  it("loads plans, subscription, and invoices from the provider", async () => {
    server.use(
      http.get("*/api/v1/billing/plans", () =>
        HttpResponse.json([{ id: "starter", name: "Starter", tier: "Starter" }]),
      ),
      http.get("*/api/v1/billing/subscription", () =>
        HttpResponse.json({
          id: "11111111-1111-4111-8111-111111111111",
          plan: "Professional",
          status: "Trialing",
          billingCycle: "Monthly",
          currentPeriodStart: "2026-08-01T00:00:00Z",
          currentPeriodEnd: "2026-08-15T00:00:00Z",
          trialEndsAt: "2026-08-15T00:00:00Z",
          usage: [{ metric: "SalesThisMonth", used: 2, limit: 500 }],
        }),
      ),
      http.get("*/api/v1/billing/invoices", () =>
        HttpResponse.json([
          {
            id: "22222222-2222-4222-8222-222222222222",
            number: "INV-1",
            status: "Paid",
            total: "49.00",
            issuedAt: "2026-08-01T00:00:00Z",
          },
        ]),
      ),
    );

    expect(await fetchPlans()).toHaveLength(1);
    expect((await fetchSubscription()).status).toBe("Trialing");
    expect((await fetchInvoices())[0]?.number).toBe("INV-1");
  });
});
