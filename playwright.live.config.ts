import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Live InventoryX Playwright config — no MSW.
 *
 * Dev server points at a real InventoryX origin from `.env.live.local` / `.env`
 * (currently http://localhost:5291 — HTTP on 5291; HTTPS is not served there).
 * `ignoreHTTPSErrors` stays on for alternate HTTPS InventoryX profiles.
 *
 * Credentials (optional): LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD
 * Prefer gitignored `.env.live.local` (agent shells do not inherit your interactive exports).
 * Run: pnpm test:e2e:live
 *
 * `reuseExistingServer` is always false so a stale Vite (wrong origin / MSW on)
 * cannot be reused from an interactive `pnpm dev` or mock E2E run.
 */
function loadLiveEnvFile() {
  const filePath = path.resolve(import.meta.dirname, ".env.live.local");
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLiveEnvFile();

const inventoryxOrigin =
  process.env.VITE_INVENTORYX_ORIGIN?.trim() || "http://localhost:5291";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /(?:live-smoke|us4-offline-provider)\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 120_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // Required when InventoryX serves HTTPS with a local/dev certificate.
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: `VITE_API_MOCKING=false VITE_E2E_OFFLINE_BRIDGE=true VITE_INVENTORYX_ORIGIN=${inventoryxOrigin} pnpm dev --host 127.0.0.1 --port 5173`,
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
