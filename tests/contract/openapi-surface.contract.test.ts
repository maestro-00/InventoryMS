import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const CONSUMED_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["post", "/api/v1/auth/register"],
  ["post", "/api/v1/auth/login"],
  ["post", "/api/v1/auth/google"],
  ["get", "/api/v1/tenant"],
  ["patch", "/api/v1/tenant"],
  ["post", "/api/v1/tenant/export"],
  ["get", "/api/v1/tenant/export/{jobId}"],
  ["get", "/api/v1/users"],
  ["post", "/api/v1/users/invitations"],
  ["post", "/api/v1/users/invitations/{id}/accept"],
  ["patch", "/api/v1/users/{id}"],
  ["get", "/api/v1/roles"],
  ["get", "/api/v1/audit-log"],
  ["get", "/api/v1/billing/plans"],
  ["get", "/api/v1/billing/subscription"],
  ["get", "/api/v1/categories"],
  ["post", "/api/v1/categories"],
  ["get", "/api/v1/products"],
  ["get", "/api/v1/products/{id}"],
  ["get", "/api/v1/tax-treatments"],
  ["post", "/api/v1/import/products"],
  ["get", "/api/v1/export/products"],
  ["get", "/api/v1/locations"],
  ["get", "/api/v1/stock"],
  ["get", "/api/v1/stock/movements"],
  ["get", "/api/v1/products/{id}/batches"],
  ["get", "/api/v1/batches/{id}/trace"],
  ["post", "/api/v1/transfers"],
  ["post", "/api/v1/counts"],
  ["get", "/api/v1/alerts"],
  ["get", "/api/v1/registers"],
  ["post", "/api/v1/registers/{registerId}/shifts"],
  ["post", "/api/v1/shifts/{shiftId}/close"],
  ["post", "/api/v1/sales"],
  ["post", "/api/v1/returns"],
  ["get", "/api/v1/sync/snapshot"],
  ["post", "/api/v1/sync/sales"],
  ["get", "/api/v1/suppliers"],
  ["get", "/api/v1/suppliers/{id}/products"],
  ["get", "/api/v1/suppliers/{id}/orders"],
  ["get", "/api/v1/purchase-orders"],
  ["post", "/api/v1/purchase-orders"],
  ["post", "/api/v1/supplier-invoices"],
  ["get", "/api/v1/dashboard"],
  ["get", "/api/v1/reports/sales"],
  ["get", "/api/v1/reports/schedules"],
  ["post", "/api/v1/reports/schedules"],
  ["get", "/api/v1/notifications"],
  ["get", "/api/v1/notification-preferences"],
];

interface OpenApiParameter {
  name?: string;
  in?: string;
  schema?: { default?: unknown; maximum?: unknown; $ref?: string };
}

interface OpenApiOperation {
  parameters?: OpenApiParameter[];
  responses?: Record<string, { content?: Record<string, unknown> }>;
  "x-inventoryx-live-only"?: boolean;
  "x-inventoryx-live-only-reason"?: string;
}

interface OpenApiDocument {
  openapi: string;
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, unknown> };
}

function loadSnapshot(): OpenApiDocument {
  expect(existsSync(SNAPSHOT_PATH), `${SNAPSHOT_PATH} must exist`).toBe(true);
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as OpenApiDocument;
}

function collectParameters(
  doc: OpenApiDocument,
  path: string,
  method: string,
): OpenApiParameter[] {
  const operation = doc.paths[path]?.[method];
  expect(operation, `${method.toUpperCase()} ${path} must exist`).toBeDefined();
  return operation?.parameters ?? [];
}

describe("OpenAPI surface", () => {
  it("captures every consumed /api/v1 operation", () => {
    const doc = loadSnapshot();
    expect(doc.openapi.startsWith("3.")).toBe(true);

    for (const [method, path] of CONSUMED_OPERATIONS) {
      const operations = doc.paths[path];
      expect(operations, `missing path ${path}`).toBeDefined();
      expect(
        operations?.[method],
        `missing ${method.toUpperCase()} ${path}`,
      ).toBeDefined();
    }
  });

  it("documents paging defaults and the page-size maximum of 200", () => {
    const doc = loadSnapshot();
    const parameters = collectParameters(doc, "/api/v1/reports/schedules", "get");
    const page = parameters.find((parameter) => parameter.name === "page");
    const pageSize = parameters.find((parameter) => parameter.name === "pageSize");

    expect(page?.schema?.default).toBe(1);
    expect(pageSize?.schema?.default).toBe(50);
    expect(pageSize?.schema?.maximum).toBe(200);
  });

  it("documents ETag / If-Match concurrency headers", () => {
    const raw = readFileSync(SNAPSHOT_PATH, "utf8");
    expect(raw).toMatch(/ETag|etag/);
    expect(raw).toMatch(/If-Match|if-match|IfMatch/);
  });

  it("documents RFC 7807 problem+json responses", () => {
    const doc = loadSnapshot();
    const raw = JSON.stringify(doc);
    expect(raw).toMatch(/application\/problem\+json|ProblemDetails/);
    const schemas = doc.components?.schemas ?? {};
    const hasProblemSchema = Object.keys(schemas).some((name) => /problem/i.test(name));
    expect(hasProblemSchema || raw.includes("application/problem+json")).toBe(true);
  });

  it("exposes live-only operation metadata used by the client", () => {
    const doc = loadSnapshot();
    const liveOnly: string[] = [];
    for (const [path, operations] of Object.entries(doc.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (operation["x-inventoryx-live-only"] === true) {
          liveOnly.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
    expect(liveOnly.length).toBeGreaterThan(0);
    expect(liveOnly.some((entry) => entry.includes("/api/v1/returns"))).toBe(true);
  });
});
