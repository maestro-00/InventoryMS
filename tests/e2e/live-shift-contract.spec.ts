import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Live InventoryX shift contract — verifies cash-movement body uses `type`
 * (not `direction`) and that open → cash-in → close succeeds without 5xx.
 *
 * Gated on LIVE_E2E_EMAIL / LIVE_E2E_PASSWORD (see .env.live.local).
 */

const liveEmail = process.env.LIVE_E2E_EMAIL?.trim();
const livePassword = process.env.LIVE_E2E_PASSWORD?.trim();
const hasLiveCredentials = Boolean(liveEmail && livePassword);
const inventoryxOrigin =
  process.env.VITE_INVENTORYX_ORIGIN?.trim() || "http://localhost:5291";

async function apiJson<T>(
  request: APIRequestContext,
  method: "GET" | "POST",
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

async function loginApi(request: APIRequestContext): Promise<string> {
  const response = await request.fetch(`${inventoryxOrigin}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: { email: liveEmail, password: livePassword },
    ignoreHTTPSErrors: true,
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as { accessToken?: string };
  expect(body.accessToken).toBeTruthy();
  return body.accessToken!;
}

test.describe("@critical live shift contract", () => {
  test.skip(
    !hasLiveCredentials,
    "Set LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD in .env.live.local",
  );

  test("opens shift, records cash in with type field, and closes shift", async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const accessToken = await loginApi(request);
    const stamp = Date.now();

    const location = await apiJson<{ id: string }>(
      request,
      "POST",
      "/api/v1/locations",
      accessToken,
      { name: `Shift contract shop ${String(stamp)}` },
    );
    expect(location.status, JSON.stringify(location.body)).toBeLessThan(300);
    expect(location.body.id).toBeTruthy();

    const register = await apiJson<{ id: string }>(
      request,
      "POST",
      "/api/v1/registers",
      accessToken,
      { locationId: location.body.id, name: `Shift contract till ${String(stamp)}` },
    );
    expect(register.status, JSON.stringify(register.body)).toBeLessThan(300);

    const open = await apiJson<{ id: string; status?: string }>(
      request,
      "POST",
      `/api/v1/registers/${register.body.id}/shifts`,
      accessToken,
      { openingFloat: 100 },
    );
    expect(open.status, JSON.stringify(open.body)).toBeLessThan(300);
    expect(open.body.id).toBeTruthy();
    expect(open.body.status ?? "Open").toMatch(/open/i);

    const cashIn = await apiJson<{ type?: string; amount?: number }>(
      request,
      "POST",
      `/api/v1/shifts/${open.body.id}/cash-movements`,
      accessToken,
      { type: "CashIn", amount: 10, reason: "PettyCash" },
    );
    expect(cashIn.status, JSON.stringify(cashIn.body)).toBeLessThan(500);
    expect(cashIn.status, "cash movement must not be rejected as validation").toBeLessThan(
      400,
    );
    if (cashIn.body.type) {
      expect(cashIn.body.type).toBe("CashIn");
    }

    const close = await apiJson<{ status?: string }>(
      request,
      "POST",
      `/api/v1/shifts/${open.body.id}/close`,
      accessToken,
      { closingCounted: 110 },
    );
    expect(close.status, JSON.stringify(close.body)).toBeLessThan(500);
    expect(close.status).toBeLessThan(400);
    expect(close.body.status ?? "Closed").toMatch(/closed/i);
  });
});
