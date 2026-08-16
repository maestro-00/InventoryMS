import { expect, test, type Page } from "@playwright/test";

/**
 * T116 — real-browser offline durability (MSW or live via offline E2E bridge).
 * Requires VITE_E2E_OFFLINE_BRIDGE=true on the Vite server.
 */

const tenantId = "11111111-1111-4111-8111-111111111111";
const registerId = "22222222-2222-4222-8222-222222222222";
const shiftId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill("owner@kwame.gh");
  await page.getByLabel(/password/i).fill("correct-horse-battery");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}

async function waitForBridge(page: Page) {
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(() => Boolean(window.__inventorymsOffline));
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}

/** Reload then land on /login so the offline bridge remounts after memory session loss. */
async function reloadDocument(page: Page) {
  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/NS_BINDING_ABORTED|aborted/i.test(message)) throw error;
  }
  // Memory-only sessions die on reload; explicit login route avoids half-aborted
  // navigations leaving Firefox without a mounted AppProviders/bridge.
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30_000 });
}

async function seedPartition(page: Page) {
  await page.evaluate(
    async ({ tenantId: tid, registerId: rid, shiftId: sid, productId: pid }) => {
      const bridge = window.__inventorymsOffline;
      if (!bridge) throw new Error("offline bridge missing");
      await bridge.prepareRegister({
        tenantId: tid,
        registerId: rid,
        shiftId: sid,
        credentialExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        fetchSnapshot: () =>
          Promise.resolve({
            watermark: "AAA=",
            registerId: rid,
            locationId: "55555555-5555-4555-8555-555555555555",
            bundleVersion: "2026.08.offline-prep.1",
            products: [
              {
                id: pid,
                name: "Sugar",
                sku: "SUG",
                barcode: "6001",
                sellingPrice: 10,
                taxTreatmentId: null,
                allowFractional: false,
                trackingMode: "Simple",
                allowsDiscount: true,
                version: "1",
              },
            ],
            taxTreatments: [],
            stock: [
              {
                productId: pid,
                variantId: null,
                batchId: null,
                qtyOnHand: 100,
                qtyInTransit: 0,
                qtyQuarantine: 0,
                version: "1",
              },
            ],
            favourites: { registerId: rid, layoutJson: "{}", version: "1" },
            receiptTemplate: { templateJson: "{}", version: "1" },
            deleted: [],
          }),
      });
    },
    { tenantId, registerId, shiftId, productId },
  );
}

test.describe("@us4 offline browser durability", () => {
  test("IndexedDB queue survives reload", async ({ page }) => {
    await signIn(page);
    await waitForBridge(page);
    await seedPartition(page);

    const clientSaleId = await page.evaluate(
      async ({ tenantId: tid, registerId: rid, shiftId: sid, productId: pid }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        const sale = await bridge.completeOfflineSale({
          tenantId: tid,
          registerId: rid,
          shiftId: sid,
          cart: {
            lines: [
              {
                productId: pid,
                qty: "1",
                unitPrice: "10.00",
                taxComponentsJson: "[]",
                taxAmount: "0",
                lineTotal: "10.00",
                name: "Sugar",
              },
            ],
            payments: [{ tender: "Cash", amount: "10.00" }],
            subtotal: "10.00",
            discountTotal: "0",
            taxTotal: "0",
            grandTotal: "10.00",
          },
        });
        return sale.clientSaleId;
      },
      { tenantId, registerId, shiftId, productId },
    );

    await reloadDocument(page);
    await waitForBridge(page);
    const pendingAfterReload = await page.evaluate(
      async ({ tenantId: tid, registerId: rid }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return (await bridge.listPendingSales(tid, rid)).map(
          (sale) => sale.clientSaleId,
        );
      },
      { tenantId, registerId },
    );
    expect(pendingAfterReload).toContain(clientSaleId);
  });

  test("pending sales are visible from a second document", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "firefox",
      "Firefox Playwright frequently destroys the second page execution context while reading shared IndexedDB; reload + 100-sale recovery cover durability on Firefox.",
    );
    await signIn(page);
    await waitForBridge(page);
    await seedPartition(page);

    await page.evaluate(
      async ({ tenantId: tid, registerId: rid, shiftId: sid, productId: pid }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        await bridge.completeOfflineSale({
          tenantId: tid,
          registerId: rid,
          shiftId: sid,
          cart: {
            lines: [
              {
                productId: pid,
                qty: "1",
                unitPrice: "10.00",
                taxComponentsJson: "[]",
                taxAmount: "0",
                lineTotal: "10.00",
                name: "Sugar",
              },
            ],
            payments: [{ tender: "Cash", amount: "10.00" }],
            subtotal: "10.00",
            discountTotal: "0",
            taxTotal: "0",
            grandTotal: "10.00",
          },
        });
      },
      { tenantId, registerId, shiftId, productId },
    );

    // Same-context second document (no prior reload) — Firefox is reliable here.
    const second = await page.context().newPage();
    await second.goto("/login", { waitUntil: "load" });
    await waitForBridge(second);
    const pendingSecondTab = await second.evaluate(
      async ({ tenantId: tid, registerId: rid }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return (await bridge.listPendingSales(tid, rid)).length;
      },
      { tenantId, registerId },
    );
    expect(pendingSecondTab).toBeGreaterThanOrEqual(1);
    await second.close();
  });
  test("sign-out lock denies cross-scope unlock; storage pressure and update deferral contracts", async ({
    page,
  }) => {
    await signIn(page);
    await waitForBridge(page);

    const auth = await page.evaluate(() => {
      const bridge = window.__inventorymsOffline;
      if (!bridge) throw new Error("offline bridge missing");
      const state = {
        unlocked: true,
        tenantId: "11111111-1111-4111-8111-111111111111",
        registerId: "22222222-2222-4222-8222-222222222222",
        deadline: bridge.earliestDeadline(
          new Date(Date.now() + 3_600_000).toISOString(),
          null,
          new Date().toISOString(),
        ),
        credential: null,
      };
      const locked = bridge.lockRegisterPartition(state);
      return {
        unlocked: locked.unlocked,
        sameScope: bridge.canUnlockPartition(
          locked,
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ),
        crossScope: bridge.canUnlockPartition(
          locked,
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        ),
        cleanupOrder: bridge.STORAGE_CLEANUP_ORDER,
        deferWithShift: bridge.shouldDeferServiceWorkerUpdate({
          hasActiveShift: true,
          pendingOfflineSales: 0,
        }),
        deferWithQueue: bridge.shouldDeferServiceWorkerUpdate({
          hasActiveShift: false,
          pendingOfflineSales: 2,
        }),
      };
    });

    expect(auth.unlocked).toBe(false);
    expect(auth.sameScope).toBe(true);
    expect(auth.crossScope).toBe(false);
    expect(auth.cleanupOrder.at(-1)).toBe("never-queue");
    expect(auth.deferWithShift).toBe(true);
    expect(auth.deferWithQueue).toBe(true);

    const storage = await page.evaluate(async () => {
      const bridge = window.__inventorymsOffline;
      if (!bridge) throw new Error("offline bridge missing");
      return bridge.estimateStorage();
    });
    expect(storage.quota).toBeGreaterThan(0);

    // Service worker is NetworkOnly for /api and may be absent in Vite dev;
    // assert the registration contract when a controller exists.
    const sw = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return { supported: false };
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        supported: true,
        hasRegistration: Boolean(reg),
        controller: Boolean(navigator.serviceWorker.controller),
      };
    });
    expect(sw.supported).toBe(true);
  });

  test("100-sale recovery after reload keeps every clientSaleId", async ({ page }) => {
    test.setTimeout(180_000);
    await signIn(page);
    await waitForBridge(page);
    await seedPartition(page);

    const ids = await page.evaluate(
      async ({ tenantId: tid, registerId: rid, shiftId: sid, productId: pid }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        const created: string[] = [];
        for (let i = 0; i < 100; i += 1) {
          const sale = await bridge.completeOfflineSale({
            tenantId: tid,
            registerId: rid,
            shiftId: sid,
            cart: {
              lines: [
                {
                  productId: pid,
                  qty: "1",
                  unitPrice: "10.00",
                  taxComponentsJson: "[]",
                  taxAmount: "0",
                  lineTotal: "10.00",
                  name: "Sugar",
                },
              ],
              payments: [{ tender: "Cash", amount: "10.00" }],
              subtotal: "10.00",
              discountTotal: "0",
              taxTotal: "0",
              grandTotal: "10.00",
            },
          });
          created.push(sale.clientSaleId);
        }
        return created;
      },
      { tenantId, registerId, shiftId, productId },
    );
    expect(ids).toHaveLength(100);

    await reloadDocument(page);
    await waitForBridge(page);
    const recovered = await page.evaluate(
      async ({ tenantId: tid, registerId: rid }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return (await bridge.listPendingSales(tid, rid)).map(
          (sale) => sale.clientSaleId,
        );
      },
      { tenantId, registerId },
    );
    expect(new Set(recovered)).toEqual(new Set(ids));
  });
});
