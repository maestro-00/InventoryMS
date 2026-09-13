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

test("@critical batch list FEFO, expiry filter, and recall trace", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await navigateApp(page, "Batches");
  await expect(page.getByRole("heading", { name: /^batches$/i })).toBeVisible();
  await expect(page.getByText(/batches \(fefo order\)/i)).toBeVisible();
  await expect(page.getByText(/batch-1/i).first()).toBeVisible();
  await selectFieldOption(page, /expiry horizon days/i, "30");
  await selectFieldOption(page, /trace batch/i, { label: "BATCH-1" });
  await expect(page.getByText(/recall trace/i)).toBeVisible();
  await expect(page.getByText(/tema wholesale/i)).toBeVisible();
  await expect(page.getByText(/affected sales/i)).toBeVisible();
});
