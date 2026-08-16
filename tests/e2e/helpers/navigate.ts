import { expect, type Page } from "@playwright/test";

/**
 * In-app navigation that never document-reloads (session is memory-only).
 * Mobile sheet links can sit outside the initial viewport; click via evaluate so
 * Playwright does not stall on actionability when the drawer is scrollable.
 */
export async function navigateApp(page: Page, label: string | RegExp) {
  const primary = page.getByRole("navigation", { name: "Primary" });
  if (await primary.isVisible()) {
    await primary.getByRole("link", { name: label }).click();
    return;
  }

  await page.getByRole("button", { name: /open navigation/i }).click();
  const dialog = page.getByRole("dialog", { name: /navigation/i });
  await expect(dialog).toBeVisible();
  const link = dialog.getByRole("link", { name: label });
  await link.evaluate((el: HTMLAnchorElement) => {
    el.click();
  });
}

function isTransientNavigationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("NS_BINDING_ABORTED") ||
    message.includes("NS_ERROR_FAILURE") ||
    message.includes("frame was detached") ||
    message.includes("Navigation interrupted")
  );
}

/** Firefox occasionally aborts back-to-back document navigations in CI. */
export async function gotoStable(page: Page, route: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("domcontentloaded");
      return;
    } catch (error) {
      lastError = error;
      if (!isTransientNavigationError(error) || attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(300 * (attempt + 1));
    }
  }
  throw lastError;
}
