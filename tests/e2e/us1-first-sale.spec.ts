import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";
import { selectFieldOption } from "./helpers/select-field";

/**
 * Onboarding through the first sale. The suite drives the app against the in-browser
 * mock provider (`VITE_API_MOCKING=true`); it is a journey check, not provider
 * verification.
 */

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function createLocation(page: Page) {
  await navigateApp(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByLabel(/address/i).fill("12 Oxford Street, Accra");
  await page.getByRole("button", { name: /save location/i }).click();
  await expect(page.getByRole("button", { name: /select main shop/i })).toBeVisible();
}

async function createProduct(page: Page) {
  await navigateApp(page, "Products");
  await page.getByRole("button", { name: /add a product/i }).click();
  await page.getByLabel(/product name/i).fill("Sugar 1kg");
  await page.getByLabel(/^sku/i).fill("SUG-001");
  await page.getByLabel(/selling price/i).fill("10.00");
  await page.getByLabel(/cost price/i).fill("6.00");
  await selectFieldOption(page, /tax treatment/i, "GH-STD");
  await page.getByRole("button", { name: /save product/i }).click();
  await expect(page.getByRole("cell", { name: "Sugar 1kg" })).toBeVisible({
    timeout: 15_000,
  });
}

async function submitNamedButton(page: Page, name: RegExp) {
  const button = page.getByRole("button", { name });
  await expect(button).toBeVisible({ timeout: 15_000 });
  // Bypass actionability stability checks: Firefox + React remounts were racing
  // Playwright's "stable" click on submit buttons in this journey.
  await button.evaluate((el: HTMLButtonElement) => {
    el.click();
  });
}

async function recordOpeningStock(page: Page) {
  await navigateApp(page, "Opening stock");
  await selectFieldOption(page, /location/i, { label: "Main Shop" });
  await selectFieldOption(page, /product/i, { label: "Sugar 1kg" });
  const qty = page.getByLabel(/opening quantity/i);
  await qty.fill("10");
  await expect(qty).toHaveValue("10");
  await submitNamedButton(page, /^record opening stock$/i);
  await expect(page.getByRole("status").filter({ hasText: /applied/i })).toBeVisible({
    timeout: 15_000,
  });
}

async function createRegisterAndOpenShift(page: Page) {
  await navigateApp(page, "Sell");
  const registerName = page.getByLabel(/register name/i);
  await expect(registerName).toBeVisible({ timeout: 15_000 });
  await registerName.fill("Counter 1");
  await expect(registerName).toHaveValue("Counter 1");
  await submitNamedButton(page, /^create register$/i);
  await expect(page.getByText(/open a shift before selling/i)).toBeVisible({
    timeout: 15_000,
  });
  const openingFloat = page.getByLabel(/opening float/i);
  await openingFloat.fill("100.00");
  await expect(openingFloat).toHaveValue("100.00");
  await submitNamedButton(page, /^open shift$/i);
}

test("@critical an owner can go from sign-in to a completed first sale", async ({
  page,
}) => {
  await signIn(page);
  await createLocation(page);
  await createProduct(page);
  await recordOpeningStock(page);
  await createRegisterAndOpenShift(page);

  await expect(page.getByText("Sugar 1kg: 10 on hand")).toBeVisible();

  await page.getByRole("button", { name: /add sugar 1kg/i }).click();
  await page.getByLabel(/quantity for sugar 1kg/i).fill("2");
  await page.getByLabel(/cash received/i).fill("25.00");
  await page.getByRole("button", { name: /take cash payment/i }).click();

  await expect(
    page.getByRole("heading", { name: /receipt rcp-000001/i }),
  ).toBeVisible();
  // Totals are the provider's; the client only displays them.
  await expect(page.getByText("GH₵23.00")).toBeVisible();
  await expect(page.getByText("Sugar 1kg: 8 on hand")).toBeVisible();

  await page.getByRole("button", { name: /view sale history/i }).click();
  await expect(page.getByRole("table", { name: /sale history/i })).toBeVisible();
});

test("@critical a repeated payment click completes a single sale", async ({ page }) => {
  await signIn(page);
  await createLocation(page);
  await createProduct(page);
  await recordOpeningStock(page);
  await createRegisterAndOpenShift(page);

  await page.getByRole("button", { name: /add sugar 1kg/i }).click();
  await page.getByLabel(/quantity for sugar 1kg/i).fill("2");
  await page.getByLabel(/cash received/i).fill("25.00");

  const pay = page.getByRole("button", { name: /take cash payment/i });
  await pay.dblclick();

  await expect(
    page.getByRole("heading", { name: /receipt rcp-000001/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /view sale history/i }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
});
