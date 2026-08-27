import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";

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

test("@critical owner invites cashier, sets PIN, enrolls 2FA, and reviews audit", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await navigateApp(page, "Staff");
  await expect(
    page.getByRole("heading", { name: /staff administration/i }),
  ).toBeVisible();

  await page.getByLabel(/invite email/i).fill("cashier@kwame.gh");
  await page.getByLabel(/^role$/i).selectOption({ label: "Cashier · Sell" });
  await submitNamedButton(page, /send invitation/i);
  await expect(page.getByRole("status")).toContainText(/invitation token issued/i, {
    timeout: 15_000,
  });
  await expect(page.getByText(/cashier@kwame.gh · cashier · invited/i)).toBeVisible({
    timeout: 15_000,
  });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel(/new pin/i).fill("2468");
  await submitNamedButton(page, /set pin/i);
  await expect(page.getByText(/pin updated/i)).toBeVisible({ timeout: 15_000 });

  await expect(page.getByText(/userinvited|registerpinset/i).first()).toBeVisible();

  await navigateApp(page, "Security");
  await submitNamedButton(page, /enroll 2fa/i);
  await expect(page.getByText(/2fa enrollment started/i)).toBeVisible({
    timeout: 15_000,
  });
});
