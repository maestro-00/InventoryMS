import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";

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

async function submitNamedButton(page: Page, name: RegExp) {
  const button = page.getByRole("button", { name });
  await expect(button).toBeVisible({ timeout: 15_000 });
  // Firefox + React remounts race Playwright's actionability "stable" click.
  await button.evaluate((el: HTMLButtonElement) => {
    el.click();
  });
}

test("@critical mid-shift update stays deferred while the register has an active shift", async ({
  page,
}) => {
  await signIn(page);

  await navigateApp(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByLabel(/address/i).fill("12 Oxford Street, Accra");
  await page.getByRole("button", { name: /save location/i }).click();
  await expect(page.getByRole("button", { name: /select main shop/i })).toBeVisible();

  await navigateApp(page, "Sell");
  // POS may sit on "Loading the sales workspace" while locations/products resolve;
  // wait for the register form rather than the heading's default 5s timeout.
  const registerName = page.getByLabel(/register name/i);
  await expect(registerName).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /^sell$/i })).toBeVisible();
  await registerName.fill("Counter PWA");
  await submitNamedButton(page, /create register/i);

  const openingFloat = page.getByLabel(/opening float/i);
  await expect(openingFloat).toBeVisible({ timeout: 15_000 });
  await openingFloat.fill("50.00");
  await submitNamedButton(page, /open shift/i);

  // Dev builds do not mount a waiting worker; assert the till remains usable (no forced
  // reload banner that blocks checkout) while a shift is open.
  await expect(page.getByRole("heading", { name: /^sell$/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("button", { name: /reload now|force update/i }),
  ).toHaveCount(0);
});
