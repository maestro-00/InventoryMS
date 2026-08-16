import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SNAPSHOT_PATH = "openapi/inventoryx-v1.json";

const US6_OPERATIONS: ReadonlyArray<readonly [method: string, path: string]> = [
  ["get", "/api/v1/registers"],
  ["post", "/api/v1/registers"],
  ["get", "/api/v1/registers/{registerId}/favourites"],
  ["put", "/api/v1/registers/{registerId}/favourites"],
];

describe("US6 provider contract surface", () => {
  it("captures register and favourites operations used by shift workspace", () => {
    const doc = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as {
      paths: Record<string, Record<string, unknown>>;
    };
    for (const [method, path] of US6_OPERATIONS) {
      expect(doc.paths[path], `missing ${path}`).toBeDefined();
      expect(doc.paths[path]?.[method], `missing ${method} ${path}`).toBeDefined();
    }
  });
});
