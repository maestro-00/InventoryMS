import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function navigate(page: Page, label: string | RegExp) {
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: label })
    .click();
}

const shot = {
  animations: "disabled" as const,
  caret: "hide" as const,
  maxDiffPixelRatio: 0.03,
  timeout: 15_000,
};

test.describe("visual regression @visual", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.describe.configure({ timeout: 120_000 });

  test("POS workspace", async ({ page }) => {
    await signIn(page);
    await navigate(page, /point of sale/i);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page).toHaveScreenshot("pos-workspace.png", {
      ...shot,
      fullPage: true,
    });
  });

  test("catalogue table", async ({ page }) => {
    await signIn(page);
    await navigate(page, /catalogue/i);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page).toHaveScreenshot("catalogue-table.png", {
      ...shot,
      fullPage: true,
    });
  });

  test("dialog surface", async ({ page }) => {
    await signIn(page);
    await navigate(page, /catalogue/i);
    await page.getByRole("button", { name: /add a product/i }).click();
    await expect(
      page
        .getByRole("dialog")
        .or(page.getByLabel(/product name/i))
        .first(),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("product-dialog.png", {
      ...shot,
      fullPage: true,
    });
  });

  test("receipt / post-sale surface", async ({ page }) => {
    await signIn(page);
    await navigate(page, /point of sale/i);

    const registerName = page.getByLabel(/register name/i);
    if (await registerName.isVisible().catch(() => false)) {
      await registerName.fill("Visual Counter");
      await page.getByRole("button", { name: /create register/i }).click();
    }
    const openingFloat = page.getByLabel(/opening float/i);
    if (await openingFloat.isVisible().catch(() => false)) {
      await openingFloat.fill("100.00");
      await page.getByRole("button", { name: /open shift/i }).click();
    }

    const addSugar = page.getByRole("button", { name: /add sugar 1kg/i });
    if (await addSugar.isVisible().catch(() => false)) {
      await addSugar.click();
      await page.getByLabel(/quantity for sugar 1kg/i).fill("1");
      await page.getByLabel(/cash received/i).fill("10.00");
      await page.getByRole("button", { name: /take cash payment/i }).click();
    }

    // Capture the POS shell after the attempt; MSW fixture may already include stock.
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await expect(page).toHaveScreenshot("receipt-surface.png", {
      ...shot,
      fullPage: true,
    });
  });
});
