import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000, mode: "serial" });

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
  // Do not use /dashboard/ — it also matches /login?redirect=/dashboard.
  await expect(page).toHaveURL(
    (url) => url.pathname === "/dashboard" || url.pathname === "/dashboard/",
    { timeout: 60_000 },
  );
  await expect(page.getByTestId("app-shell")).toBeVisible({ timeout: 30_000 });
}

async function openOfflineReviewAtViewport(
  page: Page,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);

  const offlineLink = () =>
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: /^Offline review$/i });
  await expect(offlineLink()).toBeVisible({ timeout: 30_000 });
  await offlineLink().scrollIntoViewIfNeeded();
  await expect(offlineLink()).toHaveAttribute("href", "/offline/review");
  await page.waitForTimeout(750);
  await offlineLink().click({ force: true });

  await expect(page).toHaveURL((url) => url.pathname.includes("/offline/review"), {
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: /^Offline review$/i })).toBeVisible();
  await page.setViewportSize(viewport);
  await expect(page.getByLabel(/offline status/i)).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test(`@a11y @responsive offline review has no critical axe violations at ${viewport.name}`, async ({
    page,
  }) => {
    await openOfflineReviewAtViewport(page, viewport);

    await expect(page.getByText(/sale\(s\) waiting to sync/i)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(serious, JSON.stringify(serious.map((item) => item.id))).toEqual([]);
  });
}

test("@a11y offline review keyboard focus order reaches status controls", async ({
  page,
}) => {
  await openOfflineReviewAtViewport(page, { width: 1440, height: 900 });

  await page.keyboard.press("Tab");
  const active = await page.evaluate(() => document.activeElement?.tagName ?? "");
  expect(active.length).toBeGreaterThan(0);

  const status = page.getByLabel(/offline status/i);
  await expect(status).toBeVisible();
  await status.focus();
  await expect(status).toBeFocused();
});

test("@responsive offline review remains usable at 200% zoom equivalent", async ({
  page,
}) => {
  await openOfflineReviewAtViewport(page, { width: 720, height: 450 });

  const status = page.getByLabel(/offline status/i);
  await expect(status).toBeVisible();
  const box = await status.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeLessThanOrEqual(720);
});
