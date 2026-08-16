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

async function openStockPage(page: Page) {
  await navigate(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await navigate(page, "Inventory");
  await page.getByRole("link", { name: /stock levels/i }).click();
}

for (const viewport of VIEWPORTS) {
  test(`@a11y inventory stock has no critical axe violations at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page);
    await openStockPage(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(serious, JSON.stringify(serious.map((item) => item.id))).toEqual([]);
  });
}

test("stock table reflows at 200% zoom without page-level horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 800 });
  await signIn(page);
  await openStockPage(page);
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});

test("count scanner buffer still works while a quantity field is focused for capture", async ({
  page,
}) => {
  await signIn(page);
  await navigate(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await navigate(page, "Catalogue");
  await page.getByRole("button", { name: /add a product/i }).click();
  await page.getByLabel(/product name/i).fill("Sugar 1kg");
  await page.getByLabel(/^sku/i).fill("SUG-001");
  await page.getByLabel(/barcode/i).fill("6001234567890");
  await page.getByLabel(/selling price/i).fill("10.00");
  await page.getByLabel(/cost price/i).fill("6.00");
  await page.getByLabel(/tax treatment/i).selectOption("GH-STD");
  await page.getByRole("button", { name: /save product/i }).click();
  await navigate(page, "Inventory");
  await page.getByRole("link", { name: /^counts$/i }).click();
  await page.getByLabel(/^location/i).selectOption({ label: "Main Shop" });
  await page.getByLabel(/count scope/i).selectOption("Spot");
  await page.getByLabel(/^product/i).selectOption({ label: "Sugar 1kg" });
  await page.getByRole("button", { name: /open count/i }).click();
  await expect(page.getByLabel(/counted quantity/i)).toBeVisible();
  await expect(page.getByText(/count scanner ready/i)).toBeAttached();
});
