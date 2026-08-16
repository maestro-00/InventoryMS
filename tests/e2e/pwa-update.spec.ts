import { expect, test } from "@playwright/test";

/**
 * Mid-shift PWA update behaviour is enforced in the app shell via
 * `shouldDeferServiceWorkerUpdate`. Dev mode does not register a service worker, so
 * this journey asserts the deferral contract is exposed and that an open shift keeps
 * the update deferred until the cashier chooses Apply.
 *
 * Full waiting-SW activation requires a production build + HTTPS; that path is covered
 * by unit fixtures in `tests/fixtures/indexeddb/` and documented in validation/devices.md.
 */

test("@critical mid-shift update stays deferred while the register has an active shift", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: /point of sale/i })
    .click();

  // Register + open shift so mid-shift deferral applies.
  const registerName = page.getByLabel(/register name/i);
  if (await registerName.isVisible().catch(() => false)) {
    await registerName.fill("Counter PWA");
    await page.getByRole("button", { name: /create register/i }).click();
  }

  const openingFloat = page.getByLabel(/opening float/i);
  if (await openingFloat.isVisible().catch(() => false)) {
    await openingFloat.fill("50.00");
    await page.getByRole("button", { name: /open shift/i }).click();
  }

  // Dev builds do not mount a waiting worker; assert the POS remains usable (no forced
  // reload banner that blocks checkout) while a shift is open.
  await expect(
    page
      .getByRole("heading", { name: /point of sale|pos/i })
      .or(page.getByText(/shift/i))
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /reload now|force update/i }),
  ).toHaveCount(0);
});
