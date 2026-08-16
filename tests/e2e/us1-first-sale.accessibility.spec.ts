import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { gotoStable, navigateApp } from "./helpers/navigate";

/**
 * Accessibility gates for the User Story 1 surface, driven against the in-browser mock
 * provider (`VITE_API_MOCKING=true`).
 */

const VIEWPORTS = [
  { name: "mobile", width: 320, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const PUBLIC_ROUTES = ["/login", "/register"] as const;

/** Authenticated destinations, reached through the in-app navigation. */
const NAV_DESTINATIONS = [
  "Set up",
  "Point of sale",
  "Catalogue",
  "Categories",
  "Locations",
  "Opening stock",
  "Business settings",
  "Receipt template",
] as const;

async function signIn(page: Page) {
  await gotoStable(page, "/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations
    .filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    )
    .flatMap((violation) =>
      violation.nodes.map((node) => `${violation.id} on ${node.target.join(" ")}`),
    );
}

test.describe.configure({ timeout: 180_000 });

for (const viewport of VIEWPORTS) {
  test(`@a11y the US1 surface has no critical or serious axe violations at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of PUBLIC_ROUTES) {
      await gotoStable(page, route);
      expect(await seriousViolations(page), `${route} at ${viewport.name}`).toEqual([]);
    }

    await signIn(page);
    expect(await seriousViolations(page), `/dashboard at ${viewport.name}`).toEqual([]);

    for (const destination of NAV_DESTINATIONS) {
      await navigateApp(page, destination);
      expect(
        await seriousViolations(page),
        `${destination} at ${viewport.name}`,
      ).toEqual([]);
    }
  });
}

test("@a11y the till is reachable and operable with the keyboard alone", async ({
  page,
}) => {
  await signIn(page);

  await navigateApp(page, "Locations");
  await page.getByLabel(/location name/i).fill("Main Shop");
  await page.getByRole("button", { name: /save location/i }).click();
  await expect(page.getByRole("button", { name: /select main shop/i })).toBeVisible();

  await navigateApp(page, "Point of sale");
  await expect(page.getByLabel(/register name/i)).toBeVisible();

  const controls = page.locator(
    "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])",
  );
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);

  const reached: string[] = [];
  for (let index = 0; index < count + 10; index += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || active === document.body) return null;
      const rect = active.getBoundingClientRect();
      const label = [
        active.getAttribute("aria-label"),
        active.textContent,
        active.id,
      ].find((candidate) => typeof candidate === "string" && candidate.trim() !== "");
      return {
        label: typeof label === "string" ? label.trim() : "",
        visible: rect.width > 0 && rect.height > 0,
      };
    });
    if (!focused) break;
    expect(focused.visible, `focused control "${focused.label}" is visible`).toBe(true);
    reached.push(focused.label);
  }

  // The till's next action must be operable without a pointer.
  expect(reached.join("|")).toMatch(/create register/i);
});

test("@a11y the till reflows at 200% zoom without horizontal scrolling", async ({
  page,
}) => {
  // 1280 CSS pixels at 200% zoom is the 640px-wide reflow requirement of WCAG 1.4.10.
  await page.setViewportSize({ width: 640, height: 800 });
  await signIn(page);
  await navigateApp(page, "Point of sale");

  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});
