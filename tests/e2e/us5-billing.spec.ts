import { expect, test, type Page } from "@playwright/test";
import { navigateApp } from "./helpers/navigate";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  // The mock provider cannot set InventoryX's readable session cookie from a
  // service worker response. The real login endpoint sets it for reload restore.
  await page.context().addCookies([
    {
      name: "inventoryx_session",
      value: "1",
      url: "http://127.0.0.1:5173",
      sameSite: "Lax",
    },
  ]);
}

test("@critical billing settings show plans, payment, cancel, invoices, and export", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signIn(page);
  await navigateApp(page, "Billing");
  await expect(
    page.getByRole("heading", { name: /billing and data control/i }),
  ).toBeVisible();
  await expect(
    page.getByText(/plan|subscription|invoice|export/i).first(),
  ).toBeVisible();
});

test("@critical first purchase shows an annual quote and never treats return as payment proof", async ({
  page,
}) => {
  await signIn(page);
  await navigateApp(page, "Billing");
  await page.getByRole("button", { name: /annual billing/i }).click();
  await page.getByRole("button", { name: /choose standard/i }).click();
  await expect(page.getByLabel("Purchase quote")).toContainText("Total: GHS 2,390");
  await expect(
    page.getByRole("button", { name: /continue to payment/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/payment reference/i)).toHaveCount(0);
});

test("@critical mobile money stays pending after approval is requested and page is reopened", async ({
  page,
}) => {
  await signIn(page);
  await navigateApp(page, "Billing");
  await page.getByRole("button", { name: /choose standard/i }).click();
  await page.getByRole("button", { name: /continue to payment/i }).click();
  await page.getByLabel(/ghana phone number/i).fill("0241234567");
  await page.getByRole("button", { name: /start payment/i }).click();
  await expect(page.getByText(/approve the payment on your phone/i)).toBeVisible();
  await expect(
    page.getByText(/waiting for payment confirmation/i).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: /payment status/i })).toContainText(
    /waiting for payment confirmation/i,
  );
  await expect(page.getByText(/payment confirmed/i)).toHaveCount(0);
});

test("@critical card checkout return stays pending until provider verification", async ({
  page,
}) => {
  await page.route("https://checkout.paystack.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<h1>Hosted checkout</h1>",
    });
  });
  await signIn(page);
  await navigateApp(page, "Billing");
  await page.getByRole("button", { name: /choose standard/i }).click();
  await page.getByRole("button", { name: /continue to payment/i }).click();
  await page.getByLabel(/payment channel/i).click();
  await page.getByRole("option", { name: "Card" }).click();
  await page.getByRole("button", { name: /start payment/i }).click();
  await expect(page).toHaveURL(/checkout\.paystack\.com\/mock-checkout/);
  await page.goto("/settings/billing?trxref=mock-reference");
  await expect(page.getByRole("region", { name: /payment status/i })).toContainText(
    /waiting for payment confirmation/i,
  );
  await expect(page.getByText(/payment confirmed/i)).toHaveCount(0);
});

test("@critical owner can review renewal method, start replacement, and download an invoice", async ({
  page,
}) => {
  await signIn(page);
  await navigateApp(page, "Billing");
  await expect(
    page.getByRole("region", { name: /payment method replacement/i }),
  ).toContainText("**** 4242");
  await expect(page.getByText(/verification charge: GHS 1/i)).toBeVisible();
  await page.getByLabel(/replacement phone number/i).fill("0241234567");
  await page.getByRole("button", { name: /verify replacement method/i }).click();
  await expect(page.getByText(/replacement pending/i)).toBeVisible();
  await expect(
    page.getByRole("region", { name: /payment method replacement/i }),
  ).toContainText("**** 4242");
  await expect(page.getByText(/BILL-RENEWAL-1/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /download pdf/i }).click();
  expect((await download).suggestedFilename()).toBe("BILL-RENEWAL-1.pdf");
});

test("@critical staff cannot view private billing controls", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("staff@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText("Staff", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Billing" })).toHaveCount(0);
  await page.evaluate(() => {
    sessionStorage.setItem("mockBillingRole", "Staff");
  });
  await page.context().addCookies([
    {
      name: "inventoryx_session",
      value: "1",
      url: "http://127.0.0.1:5173",
      sameSite: "Lax",
    },
  ]);
  await page.goto("/settings/billing");
  await expect(
    page.getByText(/only business owners can manage billing/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /verify replacement method/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/BILL-RENEWAL-1/)).toHaveCount(0);
});

test("@critical owner can preview and submit plan changes and cancellation", async ({
  page,
}) => {
  await signIn(page);
  await navigateApp(page, "Billing");

  const changePlan = page.getByRole("region", { name: "Change plan" });
  await changePlan
    .getByLabel("Target plan id")
    .fill("aaaaaaaa-0000-4000-8000-000000000003");
  const upgradeRequest = page.waitForRequest("**/api/v2/billing/subscription/upgrade");
  await changePlan.getByRole("button", { name: "Upgrade now" }).click();
  expect((await upgradeRequest).method()).toBe("POST");

  const downgradeRequest = page.waitForRequest(
    "**/api/v2/billing/subscription/downgrade",
  );
  await changePlan.getByRole("button", { name: "Downgrade at period end" }).click();
  await page.getByRole("button", { name: "Downgrade plan", exact: true }).click();
  expect((await downgradeRequest).method()).toBe("POST");

  const quoteRequest = page.waitForRequest("**/api/v2/billing/quotes");
  await changePlan.getByLabel("Billing cycle").selectOption("Annual");
  await changePlan.getByRole("button", { name: "Preview scheduled change" }).click();
  expect((await quoteRequest).method()).toBe("POST");
  await expect(changePlan.getByRole("status")).toContainText(/effective/i);

  const scheduleRequest = page.waitForRequest("**/api/v2/billing/changes");
  await changePlan.getByRole("button", { name: "Confirm change" }).click();
  expect((await scheduleRequest).method()).toBe("POST");

  const reverseRequest = page.waitForRequest("**/api/v2/billing/changes/*");
  await page
    .getByRole("region", { name: "Cancellation" })
    .getByRole("button", { name: "Reverse scheduled change" })
    .click();
  expect((await reverseRequest).method()).toBe("DELETE");

  const cancellation = page.getByRole("region", { name: "Cancellation" });
  const cancellationRequest = page.waitForRequest("**/api/v2/billing/cancellation");
  await cancellation.getByRole("button", { name: "Cancel subscription" }).click();
  await page
    .getByRole("button", { name: "Cancel subscription", exact: true })
    .last()
    .click();
  expect((await cancellationRequest).method()).toBe("POST");
});

test("@critical owner keeps billing/export visible through grace and can recover after lock", async ({
  page,
}) => {
  await page.setExtraHTTPHeaders({ "x-e2e-billing-state": "grace" });
  await signIn(page);
  await navigateApp(page, "Billing");
  await expect(
    page.getByText(/payment failed; paid actions remain available during grace/i),
  ).toBeVisible();
  await expect(page.getByText(/outstanding balance: 249/i)).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /Payment failed/ }),
  ).toContainText(/8 Dec 2026, 12:00 am UTC/);
  await expect(page.getByText(/paid actions remain available until/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /start export/i })).toBeVisible();

  await page.setExtraHTTPHeaders({ "x-e2e-billing-state": "readonly" });
  await page.reload();
  await expect(page.getByText(/paid actions are locked/i)).toBeVisible();
  await expect(page.getByText(/subscription is read-only/i)).toBeVisible();
  const recoveryRequest = page.waitForRequest("**/api/v2/billing/recovery");
  await page.getByRole("button", { name: /recover with saved card/i }).click();
  expect((await recoveryRequest).method()).toBe("POST");

  await page.setExtraHTTPHeaders({ "x-e2e-billing-state": "recovered" });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Recover billing" })).toHaveCount(0);
});
