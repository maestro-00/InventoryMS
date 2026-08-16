import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 180_000 });

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

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

for (const viewport of VIEWPORTS) {
  test(`@a11y staff page has no critical axe violations at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await signIn(page);
    await navigate(page, "Staff");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(serious, JSON.stringify(serious.map((item) => item.id))).toEqual([]);
  });
}

test("staff invite and PIN controls are keyboard reachable", async ({ page }) => {
  await signIn(page);
  await navigate(page, "Staff");
  await page.getByLabel(/invite email/i).focus();
  await expect(page.getByLabel(/invite email/i)).toBeFocused();
  await page.getByLabel(/new pin/i).focus();
  await expect(page.getByLabel(/new pin/i)).toBeFocused();
});

test("deactivate requires confirmation", async ({ page }) => {
  await signIn(page);
  await navigate(page, "Staff");
  let asked = false;
  page.once("dialog", (dialog) => {
    asked = true;
    void dialog.dismiss();
  });
  await page.getByRole("button", { name: /deactivate/i }).click();
  expect(asked).toBe(true);
  await expect(
    page.getByRole("heading", { name: /staff administration/i }),
  ).toBeVisible();
});
