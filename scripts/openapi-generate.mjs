#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

mkdirSync("src/shared/api/generated", { recursive: true });
for (const version of ["v1", "v2"]) {
  const snapshot = `openapi/inventoryx-${version}.json`;
  const output = `src/shared/api/generated/inventoryx${version === "v1" ? "" : "-v2"}.ts`;
  const result = spawnSync(
    "pnpm",
    ["exec", "openapi-typescript", snapshot, "-o", output],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log(`api:generate wrote ${output}`);
}
