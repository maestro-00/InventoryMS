import { expect, test, type Page } from "@playwright/test";

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

async function seedTill(page: Page) {
  await navigate(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await expect(page.getByRole("button", { name: /select main shop/i })).toBeVisible();

  await navigate(page, "Catalogue");
  for (const product of [
    { name: "Sugar 1kg", sku: "SUG-001", barcode: "6001234567890", price: "10.00" },
    { name: "Rice 5kg", sku: "RIC-005", barcode: "6001234567891", price: "45.00" },
    {
      name: "Cooking oil 1L",
      sku: "OIL-001",
      barcode: "6001234567892",
      price: "18.00",
    },
  ]) {
    await page.getByRole("button", { name: /add a product/i }).click();
    await page.getByLabel(/product name/i).fill(product.name);
    await page.getByLabel(/^sku/i).fill(product.sku);
    await page.getByLabel(/barcode/i).fill(product.barcode);
    await page.getByLabel(/selling price/i).fill(product.price);
    await page.getByLabel(/cost price/i).fill("6.00");
    await page.getByLabel(/tax treatment/i).selectOption("GH-STD");
    await page.getByRole("button", { name: /save product/i }).click();
    await expect(page.getByRole("cell", { name: product.name })).toBeVisible();
  }

  await navigate(page, "Point of sale");
  const registerName = page.getByLabel(/register name/i);
  await expect(registerName).toBeVisible({ timeout: 15_000 });
  await registerName.fill("Counter 1");
  await expect(registerName).toHaveValue("Counter 1");
  await page
    .getByRole("button", { name: /^create register$/i })
    .evaluate((el: HTMLButtonElement) => {
      el.click();
    });
  const openingFloat = page.getByLabel(/opening float/i);
  await expect(openingFloat).toBeVisible({ timeout: 15_000 });
  await openingFloat.fill("100.00");
  await expect(openingFloat).toHaveValue("100.00");
  await page
    .getByRole("button", { name: /^open shift$/i })
    .evaluate((el: HTMLButtonElement) => {
      el.click();
    });
  await expect(page.getByRole("combobox", { name: /search products/i })).toBeVisible({
    timeout: 15_000,
  });
}

test("@critical a cashier can scan, search, favourite, hold, split pay, and return", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signIn(page);
  await seedTill(page);

  await scanBarcode(page, "6001234567890");
  await expect(page.getByLabel(/quantity for sugar 1kg/i)).toBeVisible();

  await page.getByRole("combobox", { name: /search products/i }).fill("Rice");
  await page.getByRole("option", { name: /rice 5kg/i }).click();

  await page.getByRole("button", { name: /add cooking oil 1l/i }).click();

  await page.getByRole("button", { name: /hold this sale/i }).click();
  await expect(page.getByRole("button", { name: /recall held sale/i })).toBeVisible();

  await page.getByRole("button", { name: /add sugar 1kg/i }).click();
  await page.getByLabel(/cash received/i).fill("25.00");
  await page.getByRole("button", { name: /take cash payment/i }).click();
  await expect(page.getByRole("heading", { name: /receipt/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /start a new sale/i }).click();

  await page.getByRole("button", { name: /recall held sale/i }).click();
  await page.getByLabel(/cash amount/i).fill("50.00");
  await page.getByRole("button", { name: /add card tender/i }).click();
  await page.getByLabel(/card amount/i).fill("35.00");
  await page.getByRole("button", { name: /take split payment/i }).click();

  await expect(page.getByRole("heading", { name: /receipt/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel(/email address/i).fill("customer@kwame.gh");
  await page.getByRole("button", { name: /send email/i }).click();
  await expect(page.getByText(/email queued|delivered/i)).toBeVisible();

  await page.getByRole("button", { name: /start a new sale/i }).click();
  await page.getByRole("tab", { name: /returns/i }).click();
  await page.getByLabel(/receipt number/i).fill("RCP-000001");
  await page.getByRole("button", { name: /find sale/i }).click();
  await page.getByLabel(/return quantity for sugar 1kg/i).fill("1");
  await page.getByRole("button", { name: /confirm return/i }).click();
  await expect(page.getByText(/refund/i)).toBeVisible();
});
