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

test("@critical batch list FEFO, expiry filter, and recall trace", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await navigate(page, "Batches");
  await expect(page.getByRole("heading", { name: /^batches$/i })).toBeVisible();
  await expect(page.getByText(/batches \(fefo order\)/i)).toBeVisible();
  await expect(page.getByText(/batch-1/i).first()).toBeVisible();
  await page.getByLabel(/expiry horizon days/i).selectOption("30");
  await page.getByLabel(/trace batch/i).selectOption({ label: "BATCH-1" });
  await expect(page.getByText(/recall trace/i)).toBeVisible();
  await expect(page.getByText(/tema wholesale/i)).toBeVisible();
  await expect(page.getByText(/affected sales/i)).toBeVisible();
});
