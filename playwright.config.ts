import { defineConfig, devices } from "@playwright/test";

const viewports = {
  mobile: { width: 320, height: 800 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

export default defineConfig({
  testDir: "tests",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // No live InventoryX is assumed in CI, so the journey runs against the in-browser
    // mock provider. Provider verification is a separate, explicit gate.
    // Offline bridge enables IndexedDB Scenario D harnesses for US4 browser/quality specs.
    command:
      "VITE_API_MOCKING=true VITE_E2E_OFFLINE_BRIDGE=true pnpm dev --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: viewports.desktop },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], viewport: viewports.desktop },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], viewport: viewports.desktop },
    },
  ],
});
