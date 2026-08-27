import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * US4 Scenario D — live InventoryX provider E2E (T117).
 *
 * Gated on LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD. Uses Chromium offline mode via
 * `page.context().setOffline(true)` for the offline completion window, then
 * reconnects and uploads through `runSyncBatch` (no MSW).
 *
 * Requires VITE_E2E_OFFLINE_BRIDGE=true on the Vite server.
 */

const liveEmail = process.env.LIVE_E2E_EMAIL?.trim();
const livePassword = process.env.LIVE_E2E_PASSWORD?.trim();
const liveRegisterPin = process.env.LIVE_E2E_PIN?.trim() || "424242";
const hasLiveCredentials = Boolean(liveEmail && livePassword);
const inventoryxOrigin =
  process.env.VITE_INVENTORYX_ORIGIN?.trim() || "http://localhost:5291";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("malformed JWT");
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(
    padded.padEnd(Math.ceil(padded.length / 4) * 4, "="),
    "base64",
  ).toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

async function loginApi(request: APIRequestContext): Promise<{
  accessToken: string;
  tenantId: string;
  userId: string;
}> {
  if (!liveEmail || !livePassword) {
    throw new Error("LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD are required");
  }
  const response = await request.fetch(`${inventoryxOrigin}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: { email: liveEmail, password: livePassword },
    ignoreHTTPSErrors: true,
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { accessToken?: string };
  const accessToken = body.accessToken;
  expect(accessToken).toBeTruthy();
  if (!accessToken) throw new Error("missing access token");
  const claims = decodeJwtPayload(accessToken);
  const tenantRaw = claims.tenant_id ?? claims.tenantId;
  const tenantId = typeof tenantRaw === "string" ? tenantRaw : "";
  expect(tenantId).toBeTruthy();
  const userRaw = claims.sub ?? claims.user_id ?? claims.userId;
  const userId = typeof userRaw === "string" ? userRaw : "";
  expect(userId).toBeTruthy();
  return { accessToken, tenantId, userId };
}

async function signInLive(page: Page) {
  if (!liveEmail || !livePassword) {
    throw new Error("LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD are required");
  }
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(liveEmail);
  await page.getByLabel(/password/i).fill(livePassword);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 60_000 });
}

async function waitForBridge(page: Page) {
  await expect
    .poll(async () => page.evaluate(() => Boolean(window.__inventorymsOffline)), {
      timeout: 30_000,
    })
    .toBe(true);
}

/** Set a known PIN then unlock the till so sync/snapshot use the register token. */
async function unlockTillInPage(
  page: Page,
  input: {
    tenantId: string;
    registerId: string;
    shiftId: string;
    userId: string;
    pin: string;
  },
): Promise<string> {
  return page.evaluate(async (args) => {
    const bridge = window.__inventorymsOffline;
    if (!bridge) throw new Error("offline bridge missing");
    const exchanged = await bridge.exchangeRegisterPin({
      userId: args.userId,
      pin: args.pin,
      registerId: args.registerId,
    });
    await bridge.unlockRegister({
      tenantId: args.tenantId,
      registerId: args.registerId,
      shiftId: args.shiftId,
      accessToken: exchanged.accessToken,
      expiresAt: exchanged.expiresAt,
    });
    return exchanged.accessToken;
  }, input);
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- body typed at call sites
async function apiJson<T>(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT",
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const response = await request.fetch(`${inventoryxOrigin}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: body,
    ignoreHTTPSErrors: true,
  });
  const text = await response.text();
  let parsed: T;
  try {
    parsed = text ? (JSON.parse(text) as T) : (null as T);
  } catch {
    parsed = text as T;
  }
  return { status: response.status(), body: parsed };
}

async function seedLiveRegister(
  request: APIRequestContext,
  accessToken: string,
): Promise<{
  locationId: string;
  registerId: string;
  productId: string;
  shiftId: string;
}> {
  const stamp = Date.now();
  const location = await apiJson<{ id: string }>(
    request,
    "POST",
    "/api/v1/locations",
    accessToken,
    { name: `US4 Live Shop ${String(stamp)}` },
  );
  expect(location.status, JSON.stringify(location.body)).toBeGreaterThanOrEqual(200);
  expect(location.status).toBeLessThan(300);
  expect(location.body.id).toBeTruthy();

  const register = await apiJson<{ id: string }>(
    request,
    "POST",
    "/api/v1/registers",
    accessToken,
    { locationId: location.body.id, name: `US4 Counter ${String(stamp)}` },
  );
  expect(register.status, JSON.stringify(register.body)).toBeGreaterThanOrEqual(200);
  expect(register.status).toBeLessThan(300);

  const product = await apiJson<{ id: string }>(
    request,
    "POST",
    "/api/v1/products",
    accessToken,
    {
      name: "US4 Sugar",
      sku: `US4-${String(stamp)}`,
      barcode: `7${String(stamp).slice(-11)}`,
      unitOfMeasure: "ea",
      allowFractional: false,
      sellingPrice: 10,
      costPrice: 6,
      trackingMode: "Simple",
    },
  );
  expect(product.status, JSON.stringify(product.body)).toBeGreaterThanOrEqual(200);
  expect(product.status).toBeLessThan(300);

  const reasons = await apiJson<Array<{ code?: string }>>(
    request,
    "GET",
    "/api/v1/stock/adjustment-reasons",
    accessToken,
  );
  expect(reasons.status).toBe(200);
  const reasonCode =
    reasons.body.find((row) => /open|count|found|receive/i.test(row.code ?? ""))
      ?.code ??
    reasons.body[0]?.code ??
    "OpeningStock";

  const adjustment = await apiJson<{ id?: string; status?: string }>(
    request,
    "POST",
    "/api/v1/stock/adjustments",
    accessToken,
    {
      locationId: location.body.id,
      reasonCode,
      note: "US4 live seed",
      lines: [{ productId: product.body.id, qtyDelta: 5, unitCost: 6 }],
    },
  );
  expect(adjustment.status, JSON.stringify(adjustment.body)).toBeLessThan(500);
  if (adjustment.status < 300 && adjustment.body.id) {
    await apiJson(
      request,
      "POST",
      `/api/v1/stock/adjustments/${adjustment.body.id}/approve`,
      accessToken,
      {},
    );
  }

  const shift = await apiJson<{ id: string }>(
    request,
    "POST",
    `/api/v1/registers/${register.body.id}/shifts`,
    accessToken,
    { openingFloat: 50 },
  );
  expect(shift.status, JSON.stringify(shift.body)).toBeGreaterThanOrEqual(200);
  expect(shift.status).toBeLessThan(300);

  return {
    locationId: location.body.id,
    registerId: register.body.id,
    productId: product.body.id,
    shiftId: shift.body.id,
  };
}

test.describe("@live @us4 Scenario D offline provider", () => {
  test("prepare → offline sales → reconnect sync (applied / conflict / rejected / replay / 12h)", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(
      !hasLiveCredentials,
      "Set LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD to run US4 live provider E2E",
    );
    test.setTimeout(240_000);
    testInfo.annotations.push({
      type: "live-credentials",
      description: "LIVE_E2E_* present (values not logged)",
    });

    const { accessToken, tenantId, userId } = await loginApi(request);
    await signInLive(page);
    await waitForBridge(page);
    const seeded = await seedLiveRegister(request, accessToken);

    const pinSet = await apiJson(
      request,
      "PUT",
      `/api/v1/users/${userId}/pin`,
      accessToken,
      { pin: liveRegisterPin },
    );
    expect(pinSet.status, JSON.stringify(pinSet.body)).toBeLessThan(300);

    const registerToken = await unlockTillInPage(page, {
      tenantId,
      registerId: seeded.registerId,
      shiftId: seeded.shiftId,
      userId,
      pin: liveRegisterPin,
    });
    expect(registerToken).toBeTruthy();

    const prepared = await page.evaluate(
      async ({ tenantId: tid, registerId, shiftId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return bridge.prepareRegister({
          tenantId: tid,
          registerId,
          shiftId,
          credentialExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        });
      },
      {
        tenantId,
        registerId: seeded.registerId,
        shiftId: seeded.shiftId,
      },
    );
    expect(prepared.productCount).toBeGreaterThan(0);
    expect(Date.parse(prepared.deadline)).toBeGreaterThan(Date.now());

    const twelveHour = await page.evaluate(() => {
      const bridge = window.__inventorymsOffline;
      if (!bridge) throw new Error("offline bridge missing");
      const authorizedAt = "2026-01-01T00:00:00.000Z";
      const deadline = bridge.earliestDeadline(
        "2026-01-02T00:00:00.000Z",
        null,
        authorizedAt,
      );
      return {
        deadline,
        expected: new Date(
          Date.parse(authorizedAt) + 12 * 60 * 60 * 1000,
        ).toISOString(),
      };
    });
    expect(twelveHour.deadline).toBe(twelveHour.expected);

    await page.context().setOffline(true);

    const offlineSale = await page.evaluate(
      async ({ tenantId: tid, registerId, shiftId, productId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return bridge.completeOfflineSale({
          tenantId: tid,
          registerId,
          shiftId,
          cart: {
            lines: [
              {
                productId,
                qty: "1",
                unitPrice: "10.00",
                taxComponentsJson: "[]",
                taxAmount: "0",
                lineTotal: "10.00",
                name: "US4 Sugar",
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
      {
        tenantId,
        registerId: seeded.registerId,
        shiftId: seeded.shiftId,
        productId: seeded.productId,
      },
    );
    expect(offlineSale.receipt.label).toBe("Pending sync");

    const conflictSale = await page.evaluate(
      async ({ tenantId: tid, registerId, shiftId, productId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return bridge.completeOfflineSale({
          tenantId: tid,
          registerId,
          shiftId,
          cart: {
            lines: [
              {
                productId,
                qty: "50",
                unitPrice: "10.00",
                taxComponentsJson: "[]",
                taxAmount: "0",
                lineTotal: "500.00",
                name: "US4 Sugar",
              },
            ],
            payments: [{ tender: "Cash", amount: "500.00" }],
            subtotal: "500.00",
            discountTotal: "0",
            taxTotal: "0",
            grandTotal: "500.00",
          },
        });
      },
      {
        tenantId,
        registerId: seeded.registerId,
        shiftId: seeded.shiftId,
        productId: seeded.productId,
      },
    );

    const rejectedSale = await page.evaluate(
      async ({ tenantId: tid, registerId, shiftId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return bridge.completeOfflineSale({
          tenantId: tid,
          registerId,
          shiftId,
          cart: {
            lines: [
              {
                productId: "99999999-9999-4999-8999-999999999999",
                qty: "1",
                unitPrice: "10.00",
                taxComponentsJson: "[]",
                taxAmount: "0",
                lineTotal: "10.00",
                name: "Missing",
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
      {
        tenantId,
        registerId: seeded.registerId,
        shiftId: seeded.shiftId,
      },
    );

    await page.context().setOffline(false);

    const syncUrls: string[] = [];
    const syncAuthHeaders: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/sync/")) {
        syncUrls.push(req.url());
        syncAuthHeaders.push(req.headers()["authorization"] ?? "");
      }
    });

    const syncResult = await page.evaluate(
      async ({ tenantId: tid, registerId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        Object.defineProperty(navigator, "locks", {
          configurable: true,
          value: undefined,
        });
        return bridge.runSyncBatch({ tenantId: tid, registerId });
      },
      { tenantId, registerId: seeded.registerId },
    );
    expect(syncResult.processed).toBeGreaterThanOrEqual(1);
    expect(syncResult.stoppedForAuth).toBe(false);
    expect(syncAuthHeaders.some((header) => header === `Bearer ${registerToken}`)).toBe(
      true,
    );
    expect(syncAuthHeaders.every((header) => !header.includes(accessToken))).toBe(true);

    const statuses = await page.evaluate(
      async ({ tenantId: tid, registerId, appliedId, conflictId, rejectedId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        const db = bridge.openRegisterDatabase(tid, registerId);
        try {
          const applied = await db.offlineSales.get(appliedId);
          const conflict = await db.offlineSales.get(conflictId);
          const rejected = await db.offlineSales.get(rejectedId);
          const activeOverlays = await db.overlays
            .filter((overlay) => overlay.active)
            .count();
          return {
            applied: applied?.status ?? null,
            appliedReceipt: applied?.finalReceiptNumber ?? null,
            conflict: conflict?.status ?? null,
            rejected: rejected?.status ?? null,
            rejectionReason: rejected?.rejectionReason ?? null,
            activeOverlays,
          };
        } finally {
          db.close();
        }
      },
      {
        tenantId,
        registerId: seeded.registerId,
        appliedId: offlineSale.clientSaleId,
        conflictId: conflictSale.clientSaleId,
        rejectedId: rejectedSale.clientSaleId,
      },
    );

    expect(["applied", "applied_with_conflict"]).toContain(statuses.applied);
    expect(["applied", "applied_with_conflict", "rejected"]).toContain(
      statuses.conflict,
    );
    expect(statuses.rejected).toBe("rejected");
    expect(statuses.rejectionReason).toBeTruthy();
    expect(statuses.activeOverlays).toBeGreaterThanOrEqual(1);

    const replayPayload = await page.evaluate(
      async ({ tenantId: tid, registerId, clientSaleId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        const db = bridge.openRegisterDatabase(tid, registerId);
        try {
          const sale = await db.offlineSales.get(clientSaleId);
          if (!sale) throw new Error("sale missing for replay");
          return bridge.toProviderIngestSale(
            JSON.parse(sale.payloadJson) as never,
            sale.payloadHash,
          );
        } finally {
          db.close();
        }
      },
      {
        tenantId,
        registerId: seeded.registerId,
        clientSaleId: offlineSale.clientSaleId,
      },
    );
    const replay = await apiJson<
      Array<{ clientSaleId: string; saleId?: string; status?: string }>
    >(request, "POST", "/api/v1/sync/sales", registerToken, {
      sales: [replayPayload],
    });
    expect(replay.status).toBe(200);
    expect(replay.body[0]?.clientSaleId).toBe(offlineSale.clientSaleId);
    expect(["applied", "applied_with_conflict"]).toContain(replay.body[0]?.status);

    testInfo.annotations.push({
      type: "sync-requests-observed",
      description: String(syncUrls.length),
    });
    testInfo.annotations.push({
      type: "scenario-d",
      description: `applied=${String(statuses.applied)}; conflict=${String(statuses.conflict)}; rejected=${String(statuses.rejected)}`,
    });
  });

  test("100-sale provider batch recovers and syncs without MSW", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(
      !hasLiveCredentials,
      "Set LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD to run US4 live provider E2E",
    );
    test.setTimeout(300_000);
    testInfo.annotations.push({
      type: "live-credentials",
      description: "LIVE_E2E_* present (values not logged)",
    });

    const { accessToken, tenantId, userId } = await loginApi(request);
    await signInLive(page);
    await waitForBridge(page);
    const seeded = await seedLiveRegister(request, accessToken);

    const pinSet = await apiJson(
      request,
      "PUT",
      `/api/v1/users/${userId}/pin`,
      accessToken,
      { pin: liveRegisterPin },
    );
    expect(pinSet.status, JSON.stringify(pinSet.body)).toBeLessThan(300);

    await unlockTillInPage(page, {
      tenantId,
      registerId: seeded.registerId,
      shiftId: seeded.shiftId,
      userId,
      pin: liveRegisterPin,
    });

    await page.evaluate(
      async ({ tenantId: tid, registerId, shiftId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        await bridge.prepareRegister({
          tenantId: tid,
          registerId,
          shiftId,
          credentialExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        });
      },
      {
        tenantId,
        registerId: seeded.registerId,
        shiftId: seeded.shiftId,
      },
    );

    await page.context().setOffline(true);
    const ids = await page.evaluate(
      async ({ tenantId: tid, registerId, shiftId, productId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        const created: string[] = [];
        for (let i = 0; i < 100; i += 1) {
          const sale = await bridge.completeOfflineSale({
            tenantId: tid,
            registerId,
            shiftId,
            cart: {
              lines: [
                {
                  productId,
                  qty: "1",
                  unitPrice: "10.00",
                  taxComponentsJson: "[]",
                  taxAmount: "0",
                  lineTotal: "10.00",
                  name: "US4 Sugar",
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
      {
        tenantId,
        registerId: seeded.registerId,
        shiftId: seeded.shiftId,
        productId: seeded.productId,
      },
    );
    expect(ids).toHaveLength(100);

    // Reload requires network for the app shell; IndexedDB partition survives the round-trip.
    // In-memory session does not — re-authenticate before syncing.
    await page.context().setOffline(false);
    await page.reload();
    await signInLive(page);
    await waitForBridge(page);
    const recovered = await page.evaluate(
      async ({ tenantId: tid, registerId }) => {
        const bridge = window.__inventorymsOffline;
        if (!bridge) throw new Error("offline bridge missing");
        return (await bridge.listPendingSales(tid, registerId)).length;
      },
      { tenantId, registerId: seeded.registerId },
    );
    expect(recovered).toBe(100);

    let processed = 0;
    for (let i = 0; i < 8; i += 1) {
      const batch = await page.evaluate(
        async ({ tenantId: tid, registerId }) => {
          const bridge = window.__inventorymsOffline;
          if (!bridge) throw new Error("offline bridge missing");
          Object.defineProperty(navigator, "locks", {
            configurable: true,
            value: undefined,
          });
          return bridge.runSyncBatch({ tenantId: tid, registerId });
        },
        { tenantId, registerId: seeded.registerId },
      );
      processed += batch.processed;
      if (batch.processed === 0) break;
    }
    expect(processed).toBeGreaterThanOrEqual(100);
  });
});
