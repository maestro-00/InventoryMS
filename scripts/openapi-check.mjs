#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const snapshot = "openapi/inventoryx-v1.json";
const committed = "src/shared/api/generated/inventoryx.ts";

if (!existsSync(snapshot)) {
  console.error("api:check failed: openapi/inventoryx-v1.json is missing.");
  process.exit(1);
}

if (!existsSync(committed)) {
  console.error(
    "api:check failed: generated client is missing. Run pnpm api:generate.",
  );
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "inventoryx-openapi-"));
const generated = join(dir, "inventoryx.ts");

try {
  const result = spawnSync(
    "pnpm",
    ["exec", "openapi-typescript", snapshot, "-o", generated],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const expected = readFileSync(generated, "utf8");
  const actual = readFileSync(committed, "utf8");
  if (expected !== actual) {
    console.error(
      "api:check failed: generated client drifted from openapi/inventoryx-v1.json.",
    );
    process.exit(1);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("api:check passed: OpenAPI snapshot and generated client match.");
