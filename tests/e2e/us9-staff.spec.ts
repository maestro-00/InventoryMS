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

test("@critical owner invites cashier, sets PIN, enrolls 2FA, and reviews audit", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await navigate(page, "Staff");
  await expect(
    page.getByRole("heading", { name: /staff administration/i }),
  ).toBeVisible();

  await page.getByLabel(/invite email/i).fill("cashier@kwame.gh");
  await page.getByLabel(/^role$/i).selectOption({ label: "Cashier · Sell" });
  await page.getByRole("button", { name: /send invitation/i }).click();
  await expect(page.getByRole("status")).toContainText(/invitation token issued/i);
  await expect(page.getByText(/cashier@kwame.gh · cashier · invited/i)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel(/new pin/i).fill("2468");
  await page.getByRole("button", { name: /set pin/i }).click();
  await expect(page.getByText(/pin updated/i)).toBeVisible();

  await expect(page.getByText(/userinvited|registerpinset/i).first()).toBeVisible();

  await navigate(page, "Security");
  await page.getByRole("button", { name: /enroll 2fa/i }).click();
  await expect(page.getByText(/2fa enrollment started/i)).toBeVisible();
});
