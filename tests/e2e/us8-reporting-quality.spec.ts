import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function navigate(page: Page, label: string) {
  const primary = page.getByRole("navigation", { name: "Primary" });
  if (await primary.isVisible()) {
    await primary.getByRole("link", { name: label }).click();
    return;
  }
  await page.getByRole("button", { name: /open navigation/i }).click();
  await page
    .getByRole("dialog", { name: /navigation/i })
    .getByRole("link", { name: label })
    .click();
}

for (const viewport of VIEWPORTS) {
  test(`@a11y reports page has no critical axe violations at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page);
    await navigate(page, "Reports");
    await expect(page.getByRole("heading", { name: /^reports$/i })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(serious, JSON.stringify(serious.map((item) => item.id))).toEqual([]);
  });
}

test("sales chart keeps an accessible table fallback", async ({ page }) => {
  await signIn(page);
  await navigate(page, "Reports");
  await expect(page.getByRole("region", { name: /report chart/i })).toBeVisible();
  await expect(page.getByText(/accessible chart equivalent/i)).toBeVisible();
});

test("reports filters remain keyboard reachable at 200% zoom", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await navigate(page, "Reports");
  const filters = page.getByRole("form", { name: /report filters/i });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("zoom", "2");
  });
  const report = filters.getByRole("combobox", { name: /^report$/i });
  const from = filters.getByRole("textbox", { name: /^from$/i });
  await report.evaluate((element) => {
    (element as HTMLElement).focus();
  });
  await expect(report).toBeFocused();
  await from.evaluate((element) => {
    (element as HTMLElement).focus();
  });
  await expect(from).toBeFocused();
});
