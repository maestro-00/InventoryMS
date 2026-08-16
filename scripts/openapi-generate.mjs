#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const snapshot = "openapi/inventoryx-v1.json";
const output = "src/shared/api/generated/inventoryx.ts";

mkdirSync("src/shared/api/generated", { recursive: true });

const result = spawnSync(
  "pnpm",
  ["exec", "openapi-typescript", snapshot, "-o", output],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`api:generate wrote ${output}`);
