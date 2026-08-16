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

async function seedLocationAndProduct(page: Page) {
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
}

test("@critical replenishment through receipt, close-short, invoice variance, and landed cost", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await seedLocationAndProduct(page);

  await navigate(page, "Purchasing");
  await expect(page.getByRole("heading", { name: /^purchasing$/i })).toBeVisible();

  await page.getByLabel(/supplier name/i).fill("Accra Foods");
  await page.getByRole("button", { name: /save supplier/i }).click();
  await expect(page.getByRole("button", { name: /accra foods/i })).toBeVisible();

  const orders = page.getByRole("region", { name: /purchase orders/i });
  await expect(orders.getByRole("combobox", { name: /^supplier$/i })).toContainText(
    /tema wholesale/i,
  );
  await expect(orders.getByRole("combobox", { name: /^product$/i })).toContainText(
    /sugar 1kg/i,
  );
  await orders.getByLabel(/ordered qty/i).fill("20");
  await orders.getByLabel(/unit cost/i).fill("6.00");
  await orders.getByRole("button", { name: /create draft order/i }).click();
  await expect(page.getByText(/current status: draft/i)).toBeVisible();

  await page.getByRole("button", { name: /^submit$/i }).click();
  await expect(page.getByText(/current status: sent/i)).toBeVisible();

  const receipt = page.getByRole("form", { name: /goods receipt/i });
  await receipt.getByLabel(/quantity received/i).fill("10");
  await receipt.getByLabel(/quantity damaged/i).fill("1");
  await receipt.getByLabel(/batch number/i).fill("BATCH-1");
  await receipt.getByLabel(/expiry date/i).fill("2027-01-01");
  await receipt.getByRole("button", { name: /record receipt/i }).click();
  await expect(page.getByText(/partiallyreceived/i)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByLabel(/close-short reason/i)
    .fill("Supplier short-shipped remaining bags");
  await page.getByRole("button", { name: /close short/i }).click();
  await expect(page.getByText(/current status: closed/i)).toBeVisible();

  const invoice = page.getByRole("form", { name: /supplier invoice/i });
  await invoice.getByLabel(/invoice number/i).fill("INV-77");
  await invoice.getByLabel(/invoice unit price/i).fill("6.50");
  await invoice.getByRole("button", { name: /record invoice/i }).click();
  await expect(page.getByRole("status")).toContainText(/price difference/i);

  const landed = page.getByRole("form", { name: /landed costs/i });
  await landed.getByLabel(/total amount/i).fill("50");
  await landed.getByRole("button", { name: /^allocate$/i }).click();
  await expect(page.getByText(/new true cost on first line/i)).toBeVisible();
});
