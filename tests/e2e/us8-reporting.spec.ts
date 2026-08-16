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

test("@critical dashboard links through filtered sales report, export, schedule, and notifications", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await expect(page.getByRole("region", { name: /dashboard metrics/i })).toBeVisible();
  await expect(page.getByText(/sales today/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /sales today/i })).toHaveAttribute(
    "href",
    /\/reports\?kind=sales/,
  );

  await navigate(page, "Reports");
  await expect(page.getByRole("heading", { name: /^reports$/i })).toBeVisible();
  await expect(page.getByText(/sales report|total sales/i).first()).toBeVisible();

  await page.getByRole("button", { name: /start export/i }).click();
  await expect(page.getByRole("status")).toContainText(/ready/i, { timeout: 15_000 });

  await page.getByRole("button", { name: /create schedule/i }).click();
  await expect(page.getByText(/sales · daily · csv · active/i)).toBeVisible();

  await navigate(page, "Notifications");
  await expect(
    page.getByRole("heading", { name: /^notifications$/i, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/unread:/i)).toBeVisible();
  await page.getByRole("button", { name: /mark all read/i }).click();
  await expect(page.getByText(/unread: 0/i)).toBeVisible();
  await page.getByRole("button", { name: /save preferences/i }).click();
  await expect(page.getByRole("status")).toContainText(/preferences saved/i);
});
