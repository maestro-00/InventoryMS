#!/usr/bin/env node
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "inventoryx-openapi-"));

try {
  for (const version of ["v1", "v2"]) {
    const snapshot = `openapi/inventoryx-${version}.json`;
    const filename = `inventoryx${version === "v1" ? "" : "-v2"}.ts`;
    const committed = `src/shared/api/generated/${filename}`;
    if (!existsSync(snapshot) || !existsSync(committed)) {
      console.error(`api:check failed: ${snapshot} or ${committed} is missing.`);
      process.exit(1);
    }
    const generated = join(dir, filename);
    const result = spawnSync(
      "pnpm",
      ["exec", "openapi-typescript", snapshot, "-o", generated],
      { stdio: "inherit" },
    );
    if (result.status !== 0) process.exit(result.status ?? 1);
    if (readFileSync(generated, "utf8") !== readFileSync(committed, "utf8")) {
      console.error(`api:check failed: generated client drifted from ${snapshot}.`);
      process.exit(1);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("api:check passed: v1 and v2 snapshots and generated clients match.");
