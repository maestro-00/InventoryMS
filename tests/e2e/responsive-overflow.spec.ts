import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

/** Nav labels that keep the memory-only session (no document reload). */
const criticalNav = [
  { label: /products/i, path: /catalogue/ },
  { label: /sell/i, path: /pos/ },
  { label: /^inventory$/i, path: /inventory/ },
  { label: /reports/i, path: /reports/ },
  { label: /dashboard/i, path: /dashboard/ },
] as const;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function navigate(page: Page, label: string | RegExp) {
  const primary = page.getByRole("navigation", { name: "Primary" });
  const primaryLink = primary.getByRole("link", { name: label });
  if (await primaryLink.isVisible().catch(() => false)) {
    await primaryLink.click();
    return;
  }

  await page.getByRole("button", { name: "Open navigation" }).click();
  const mobile = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobile).toBeVisible();
  await mobile.getByRole("link", { name: label }).click();
}

async function assertNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `horizontal overflow: scrollWidth=${String(overflow.scrollWidth)} clientWidth=${String(overflow.clientWidth)}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("responsive critical routes @responsive", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const vp of viewports) {
    test(`no horizontal overflow at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");
      await assertNoPageOverflow(page);

      await signIn(page);
      await assertNoPageOverflow(page);

      for (const item of criticalNav) {
        await navigate(page, item.label);
        await expect(page).toHaveURL(item.path);
        await assertNoPageOverflow(page);
      }
    });
  }

  test("no horizontal overflow at 200% zoom on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    for (const item of criticalNav.slice(0, 3)) {
      await navigate(page, item.label);
      await expect(page).toHaveURL(item.path);
      await assertNoPageOverflow(page);
    }
  });
});
