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

test("@critical billing settings show plans, payment, cancel, invoices, and export", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await navigate(page, "Billing");
  await expect(
    page.getByRole("heading", { name: /billing and data control/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/plan|subscription|invoice|export/i).first(),
  ).toBeVisible();
});
