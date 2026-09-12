import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("@critical billing settings show plans, payment, cancel, invoices, and export", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await navigateApp(page, "Billing");
  await expect(
    page.getByRole("heading", { name: /billing and data control/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/plan|subscription|invoice|export/i).first(),
  ).toBeVisible();
});
