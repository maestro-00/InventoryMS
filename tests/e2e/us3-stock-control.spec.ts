import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";
import { selectFieldOption } from "./helpers/select-field";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function seedLocationsAndProduct(page: Page) {
  await navigateApp(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await page.getByLabel(/location name/i).fill("Warehouse B");
  await selectFieldOption(page, /location kind/i, "Warehouse");
  await page.getByRole("button", { name: /save location/i }).click();

  await navigateApp(page, "Products");
  await page.getByRole("button", { name: /add a product/i }).click();
  await page.getByLabel(/product name/i).fill("Sugar 1kg");
  await page.getByLabel(/^sku/i).fill("SUG-001");
  await page.getByLabel(/barcode/i).fill("6001234567890");
  await page.getByLabel(/selling price/i).fill("10.00");
  await page.getByLabel(/cost price/i).fill("6.00");
  await selectFieldOption(page, /tax treatment/i, "GH-STD");
  await page.getByRole("button", { name: /save product/i }).click();

  await navigateApp(page, "Opening stock");
  await selectFieldOption(page, /location/i, { label: "Main Shop" });
  await selectFieldOption(page, /product/i, { label: "Sugar 1kg" });
  await page.getByLabel(/opening quantity/i).fill("10");
  await page
    .getByRole("button", { name: /record opening stock|save opening stock/i })
    .click();
}

test("@critical a manager can transfer, receive with discrepancy, count, and approve", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await seedLocationsAndProduct(page);

  await navigateApp(page, "Inventory");
  await page.getByRole("link", { name: /transfers/i }).click();
  await selectFieldOption(page, /from location/i, { label: "Main Shop" });
  await selectFieldOption(page, /to location/i, { label: "Warehouse B" });
  await selectFieldOption(page, /^product/i, { label: "Sugar 1kg" });
  await page.getByLabel(/quantity to dispatch/i).fill("10");
  await page.getByRole("button", { name: /create draft transfer/i }).click();
  await page.getByRole("button", { name: /dispatch transfer/i }).click();
  await page.getByLabel(/quantity received/i).fill("8");
  await page.getByLabel(/discrepancy reason/i).fill("Two bags damaged in transit");
  await page.getByRole("button", { name: /receive transfer/i }).click();
  await expect(
    page.getByText(/ReceivedWithDiscrepancy|Two bags damaged/i),
  ).toBeVisible();

  await navigateApp(page, "Inventory");
  await page.getByRole("link", { name: /^counts$/i }).click();
  await selectFieldOption(page, /^location/i, { label: "Main Shop" });
  await selectFieldOption(page, /count scope/i, "Spot");
  await selectFieldOption(page, /^product/i, { label: "Sugar 1kg" });
  await page.getByRole("button", { name: /open count/i }).click();
  await page.getByLabel(/counted quantity/i).fill("7");
  await page.getByRole("button", { name: /save counted lines/i }).click();
  await page.getByRole("button", { name: /submit count/i }).click();
  await page.getByRole("button", { name: /approve count/i }).click();
  await expect(page.getByText(/Approved/i)).toBeVisible();

  await navigateApp(page, "Inventory");
  await page.getByRole("link", { name: /movements/i }).click();
  await expect(page.getByRole("region", { name: /stock movements/i })).toBeVisible();
  await expect(page.getByText(/original ledger entry/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
