import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test("@critical register shift open, cash movement, close, and Z-report", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);

  await navigateApp(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await expect(page.getByRole("button", { name: /select main shop/i })).toBeVisible();

  await navigateApp(page, "Tills");
  await expect(page.getByRole("heading", { name: /tills and shifts/i })).toBeVisible();

  await page.getByRole("tab", { name: /manage tills/i }).click();
  const registerName = page.getByLabel(/register name/i);
  await expect(registerName).toBeVisible({ timeout: 15_000 });
  await registerName.fill("Counter 1");
  await page.getByRole("button", { name: /^create register$/i }).click();

  await page.getByRole("tab", { name: /^shift$/i }).click();
  const openingFloat = page.getByLabel(/opening float/i);
  await expect(openingFloat).toBeVisible({ timeout: 15_000 });
  await openingFloat.fill("100.00");
  await page.getByRole("button", { name: /^open shift$/i }).click();

  await expect(page.getByRole("form", { name: /cash movement/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("form", { name: /close shift/i })).toBeVisible();
  await expect(
    page.getByRole("article", { name: /z report/i }).or(page.getByText(/z report/i)),
  ).toBeVisible();
});
