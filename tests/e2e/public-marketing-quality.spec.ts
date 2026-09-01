import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { gotoStable } from "./helpers/navigate";

test.describe.configure({ timeout: 180_000 });

const PUBLIC_ROUTES = ["/", "/features", "/pricing", "/login", "/register"] as const;

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

for (const route of PUBLIC_ROUTES) {
  for (const viewport of VIEWPORTS) {
    test(`@a11y ${route} has no critical axe violations at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoStable(page, route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      );
      expect(serious, JSON.stringify(serious.map((item) => item.id))).toEqual([]);
    });
  }
}

test("@a11y landing page exposes primary trial CTA", async ({ page }) => {
  await gotoStable(page, "/");
  await expect(page.getByRole("link", { name: /start free trial/i }).first()).toBeVisible();
});
