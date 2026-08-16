import { expect, test } from "@playwright/test";

/**
 * Minimal live InventoryX smoke — requires VITE_API_MOCKING=false and a reachable
 * InventoryX origin (see playwright.live.config.ts). Auth steps need
 * LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD; without them, sign-in is skipped.
 */

const liveEmail = process.env.LIVE_E2E_EMAIL?.trim();
const livePassword = process.env.LIVE_E2E_PASSWORD?.trim();
const hasLiveCredentials = Boolean(liveEmail && livePassword);

const inventoryxHost = (() => {
  const origin = process.env.VITE_INVENTORYX_ORIGIN?.trim() || "http://localhost:5291";
  try {
    return new URL(origin).host;
  } catch {
    return "localhost:5291";
  }
})();

test.describe("@live live InventoryX smoke", () => {
  test("login page loads and talks to live InventoryX", async ({ page }) => {
    const apiHits: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (url.includes(inventoryxHost) || url.includes("localhost:5291")) {
        apiHits.push(url);
      }
    });

    await page.goto("/login");

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();

    // Confirm the SPA is wired to the live origin (not MSW): at least one request
    // to InventoryX, or the login form is present while mocking is off.
    // Prefer observing network when the client probes health/auth; fall back to
    // asserting the page shell if the form is idle until submit.
    await page.getByLabel(/email/i).fill("smoke-probe@example.invalid");
    await page.getByLabel(/password/i).fill("not-a-real-password");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect
      .poll(() => apiHits.some((url) => url.includes(inventoryxHost)), {
        timeout: 30_000,
        message: `Expected at least one request to live InventoryX host ${inventoryxHost}`,
      })
      .toBe(true);

    // Invalid credentials must not reach the dashboard.
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test("sign-in reaches dashboard when LIVE_E2E credentials are set", async ({
    page,
  }) => {
    test.skip(
      !hasLiveCredentials,
      "Set LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD to exercise live sign-in",
    );
    if (!liveEmail || !livePassword) {
      return;
    }

    const consoleErrors: string[] = [];
    const apiStatuses: { status: number; path: string }[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes(inventoryxHost) && url.includes("/auth/login")) {
        apiStatuses.push({
          status: response.status(),
          path: "/api/v1/auth/login",
        });
      }
    });

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(liveEmail);
    await page.getByLabel(/password/i).fill(livePassword);
    await page.getByRole("button", { name: /^sign in$/i }).click();

    try {
      await expect(page).toHaveURL(/dashboard/, { timeout: 60_000 });
    } catch (error) {
      const alertText = (await page.getByRole("alert").allTextContents()).join(" | ");
      const url = page.url();
      throw new Error(
        [
          `Live sign-in did not reach /dashboard (url=${url}).`,
          `login_statuses=${JSON.stringify(apiStatuses)}`,
          `alert=${alertText || "(none)"}`,
          `console_errors=${consoleErrors.slice(0, 5).join(" || ") || "(none)"}`,
          String(error),
        ].join(" "),
      );
    }
  });
});
