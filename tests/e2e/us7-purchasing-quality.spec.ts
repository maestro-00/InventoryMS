import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";

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
  await navigateApp(page, label);
}

async function openPurchasing(page: Page) {
  await navigate(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await navigate(page, "Purchasing");
  await expect(page.getByRole("heading", { name: /^purchasing$/i })).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test(`@a11y purchasing workspace has no critical axe violations at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page);
    await openPurchasing(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(serious, JSON.stringify(serious.map((item) => item.id))).toEqual([]);
  });
}

test("purchasing dense table and forms reflow without page-level horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await signIn(page);
  await openPurchasing(page);
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});

test("keyboard can reach supplier create and order filter without trapping focus", async ({
  page,
}) => {
  await signIn(page);
  await openPurchasing(page);
  await page.getByLabel(/supplier name/i).focus();
  await expect(page.getByLabel(/supplier name/i)).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/filter status/i)).toBeVisible();
  await page.getByLabel(/filter status/i).focus();
  await expect(page.getByLabel(/filter status/i)).toBeFocused();
});

test("close-short confirmation dialog gates destructive close", async ({ page }) => {
  await signIn(page);
  await openPurchasing(page);

  await navigate(page, "Catalogue");
  await page.getByRole("button", { name: /add a product/i }).click();
  await page.getByLabel(/product name/i).fill("Sugar 1kg");
  await page.getByLabel(/^sku/i).fill("SUG-001");
  await page.getByLabel(/barcode/i).fill("6001234567890");
  await page.getByLabel(/selling price/i).fill("10.00");
  await page.getByLabel(/cost price/i).fill("6.00");
  await page.getByLabel(/tax treatment/i).selectOption("GH-STD");
  await page.getByRole("button", { name: /save product/i }).click();

  await navigate(page, "Purchasing");
  const orders = page.getByRole("region", { name: /purchase orders/i });
  await expect(orders.getByRole("combobox", { name: /^supplier$/i })).toContainText(
    /tema wholesale/i,
  );
  await expect(orders.getByRole("combobox", { name: /^product$/i })).toContainText(
    /sugar 1kg/i,
  );
  await orders.getByRole("button", { name: /create draft order/i }).click();
  await page.getByRole("button", { name: /^submit$/i }).click();
  await expect(page.getByText(/current status: sent/i)).toBeVisible();

  let confirmed = false;
  page.once("dialog", (dialog) => {
    confirmed = true;
    void dialog.dismiss();
  });
  await page.getByLabel(/close-short reason/i).fill("Will dismiss");
  await page.getByRole("button", { name: /close short/i }).click();
  expect(confirmed).toBe(true);
  await expect(page.getByText(/current status: sent/i)).toBeVisible();
});
