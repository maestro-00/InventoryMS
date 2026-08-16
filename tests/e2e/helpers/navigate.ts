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

export async function gotoStable(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
}
