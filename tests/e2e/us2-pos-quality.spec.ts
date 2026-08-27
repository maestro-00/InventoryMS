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

async function scanBarcode(page: Page, barcode: string) {
  await page.evaluate((value) => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    for (const key of value) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    }
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  }, barcode);
}

async function openTill(page: Page) {
  await navigate(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await navigate(page, "Products");
  await page.getByRole("button", { name: /add a product/i }).click();
  await page.getByLabel(/product name/i).fill("Sugar 1kg");
  await page.getByLabel(/^sku/i).fill("SUG-001");
  await page.getByLabel(/barcode/i).fill("6001234567890");
  await page.getByLabel(/selling price/i).fill("10.00");
  await page.getByLabel(/cost price/i).fill("6.00");
  await page.getByLabel(/tax treatment/i).selectOption("GH-STD");
  await page.getByRole("button", { name: /save product/i }).click();
  await navigate(page, "Sell");
  await page.getByLabel(/register name/i).fill("Counter 1");
  await page.getByRole("button", { name: /create register/i }).click();
  await page.getByLabel(/opening float/i).fill("100.00");
  await page.getByRole("button", { name: /open shift/i }).click();
  await expect(page.getByRole("combobox", { name: /search products/i })).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test(`@a11y the POS workspace has no critical axe violations at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page);
    await openTill(page);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(serious, JSON.stringify(serious.map((item) => item.id))).toEqual([]);
  });
}

test("barcode-to-cart p95 stays under 200 ms against the mock provider", async ({
  page,
}) => {
  await signIn(page);
  await openTill(page);

  const samples: number[] = [];
  for (let index = 0; index < 8; index += 1) {
    const started = await page.evaluate(() => performance.now());
    await scanBarcode(page, "6001234567890");
    await expect(page.getByLabel(/quantity for sugar 1kg/i)).toBeVisible();
    const ended = await page.evaluate(() => performance.now());
    samples.push(ended - started);
    await page.getByRole("button", { name: /remove sugar 1kg/i }).click();
  }

  samples.sort((left, right) => left - right);
  const p95 = samples[Math.floor(samples.length * 0.95) - 1] ?? samples.at(-1) ?? 0;
  expect(p95).toBeLessThan(200);
});

test("camera denial leaves a typed barcode fallback focused", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () =>
          Promise.reject(
            Object.assign(new Error("denied"), { name: "NotAllowedError" }),
          ),
      },
    });
  });
  await signIn(page);
  await openTill(page);
  await page.getByRole("button", { name: /scan with camera/i }).click();
  await expect(page.getByLabel(/type the barcode/i)).toBeFocused();
});
