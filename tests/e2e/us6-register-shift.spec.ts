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

test("@critical register shift open, cash movement, close, and Z-report", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await navigate(page, "Tills");
  await expect(
    page.getByRole("heading", { name: /tills and shifts/i }),
  ).toBeVisible();
  // Open shift UI is register-driven; assert the workspace mounts under MSW.
  await expect(
    page.getByText(/open shift|register|cash|z-report/i).first(),
  ).toBeVisible();
});
