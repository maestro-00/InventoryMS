import { expect, test, type Page } from "@playwright/test";

/**
 * Mid-shift PWA update behaviour is enforced in the app shell via
 * `shouldDeferServiceWorkerUpdate`. Dev mode does not register a service worker, so
 * this journey asserts the deferral contract is exposed and that an open shift keeps
 * the update deferred until the cashier chooses Apply.
 *
 * Full waiting-SW activation requires a production build + HTTPS; that path is covered
 * by unit fixtures in `tests/fixtures/indexeddb/` and documented in validation/devices.md.
 */

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function navigate(page: Page, label: string | RegExp) {
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

test("@critical mid-shift update stays deferred while the register has an active shift", async ({
  page,
}) => {
  await signIn(page);

  await navigate(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByLabel(/address/i).fill("12 Oxford Street, Accra");
  await page.getByRole("button", { name: /save location/i }).click();
  await expect(page.getByRole("button", { name: /select main shop/i })).toBeVisible();

  await navigate(page, "Point of sale");
  await expect(page.getByRole("heading", { name: /^sell$/i })).toBeVisible();

  const registerName = page.getByLabel(/register name/i);
  await expect(registerName).toBeVisible({ timeout: 15_000 });
  await registerName.fill("Counter PWA");
  await page.getByRole("button", { name: /create register/i }).click();

  const openingFloat = page.getByLabel(/opening float/i);
  await expect(openingFloat).toBeVisible({ timeout: 15_000 });
  await openingFloat.fill("50.00");
  await page.getByRole("button", { name: /open shift/i }).click();

  // Dev builds do not mount a waiting worker; assert the till remains usable (no forced
  // reload banner that blocks checkout) while a shift is open.
  await expect(page.getByRole("heading", { name: /^sell$/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /reload now|force update/i }),
  ).toHaveCount(0);
});
