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

async function seedLocationsAndProduct(page: Page) {
  await navigate(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await page.getByLabel(/location name/i).fill("Warehouse B");
  await page.getByLabel(/location kind/i).selectOption("Warehouse");
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

  await navigate(page, "Opening stock");
  await page.getByLabel(/location/i).selectOption({ label: "Main Shop" });
  await page.getByLabel(/product/i).selectOption({ label: "Sugar 1kg" });
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

  await navigate(page, "Inventory");
  await page.getByRole("link", { name: /transfers/i }).click();
  await page.getByLabel(/from location/i).selectOption({ label: "Main Shop" });
  await page.getByLabel(/to location/i).selectOption({ label: "Warehouse B" });
  await page.getByLabel(/^product/i).selectOption({ label: "Sugar 1kg" });
  await page.getByLabel(/quantity to dispatch/i).fill("10");
  await page.getByRole("button", { name: /create draft transfer/i }).click();
  await page.getByRole("button", { name: /dispatch transfer/i }).click();
  await page.getByLabel(/quantity received/i).fill("8");
  await page.getByLabel(/discrepancy reason/i).fill("Two bags damaged in transit");
  await page.getByRole("button", { name: /receive transfer/i }).click();
  await expect(
    page.getByText(/ReceivedWithDiscrepancy|Two bags damaged/i),
  ).toBeVisible();

  await navigate(page, "Inventory");
  await page.getByRole("link", { name: /^counts$/i }).click();
  await page.getByLabel(/^location/i).selectOption({ label: "Main Shop" });
  await page.getByLabel(/count scope/i).selectOption("Spot");
  await page.getByLabel(/^product/i).selectOption({ label: "Sugar 1kg" });
  await page.getByRole("button", { name: /open count/i }).click();
  await page.getByLabel(/counted quantity/i).fill("7");
  await page.getByRole("button", { name: /save counted lines/i }).click();
  await page.getByRole("button", { name: /submit count/i }).click();
  await page.getByRole("button", { name: /approve count/i }).click();
  await expect(page.getByText(/Approved/i)).toBeVisible();

  await navigate(page, "Inventory");
  await page.getByRole("link", { name: /movements/i }).click();
  await expect(page.getByText(/Adjustment|Transfer/i).first()).toBeVisible();
});
