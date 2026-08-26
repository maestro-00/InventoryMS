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
  // WebKit/Firefox + React remounts race Playwright's actionability "stable" click.
  await button.evaluate((el: HTMLButtonElement) => {
    el.click();
  });
}

test("@critical dashboard links through filtered sales report, export, schedule, and notifications", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await expect(page.getByRole("region", { name: /dashboard metrics/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/sales today/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /sales today/i })).toHaveAttribute(
    "href",
    /\/reports\?kind=sales/,
  );

  await navigateApp(page, "Reports");
  await expect(page.getByRole("heading", { name: /^reports$/i })).toBeVisible();
  await expect(page.getByText(/sales report|total sales/i).first()).toBeVisible();

  const exportPanel = page.getByRole("region", { name: /report export/i });
  await expect(exportPanel).toBeVisible({ timeout: 15_000 });
  await submitNamedButton(page, /start export/i);
  await expect(exportPanel.getByRole("status")).toContainText(/ready/i, {
    timeout: 15_000,
  });

  await submitNamedButton(page, /create schedule/i);
  await expect(page.getByText(/sales · daily · csv · active/i)).toBeVisible({
    timeout: 15_000,
  });

  await navigateApp(page, "Notifications");
  await expect(
    page.getByRole("heading", { name: /^notifications$/i, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/unread:/i)).toBeVisible();
  await submitNamedButton(page, /mark all read/i);
  await expect(page.getByText(/unread: 0/i)).toBeVisible({ timeout: 15_000 });
  await submitNamedButton(page, /save preferences/i);
  await expect(page.getByRole("status")).toContainText(/preferences saved/i, {
    timeout: 15_000,
  });
});
