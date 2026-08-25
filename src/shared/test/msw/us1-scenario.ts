import { http, HttpResponse } from "msw";

/**
 * A stateful in-memory stand-in for InventoryX covering the User Story 1 journey. It is
 * only mounted when `VITE_API_MOCKING=true`, which the end-to-end suite sets so the
 * journey can run without a live provider. It is not a substitute for provider
 * verification: totals, tax, and stock are computed here only to keep the walkthrough
 * coherent.
 */

const TENANT_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const LOCATION_ID = "33333333-3333-4333-8333-333333333333";
const LOCATION_B_ID = "34333333-3333-4333-8333-333333333333";
const PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
const RICE_ID = "45444444-4444-4444-8444-444444444444";
const OIL_ID = "46444444-4444-4444-8444-444444444444";
const CATEGORY_ID = "77777777-7777-4777-8777-777777777777";
const REGISTER_ID = "88888888-8888-4888-8888-888888888888";
const SHIFT_ID = "99999999-9999-4999-8999-999999999999";
const SALE_ID = "a9999999-9999-4999-8999-999999999999";
const RECEIPT_ID = "e9999999-9999-4999-8999-999999999999";

function accessToken(): string {
  const claims = {
    sub: USER_ID,
    tenantId: TENANT_ID,
    role: "Owner",
    permissions: [
      "Sell",
      "Refund",
      "Discount",
      "VoidSale",
      "ViewProfit",
      "ManageStock",
      "ManagePurchasing",
      "ManagePricing",
      "ManageUsers",
      "ViewReports",
      "ApproveAdjustments",
    ],
    locationScope: [LOCATION_ID],
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `header.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.signature`;
}

interface ScenarioState {
  checklist: Record<string, boolean>;
  locations: {
    id: string;
    name: string;
    address: string;
    kind: string;
    isActive: boolean;
  }[];
  registers: { id: string; locationId: string; name: string; isActive: boolean }[];
  products: Record<string, unknown>[];
  qtyOnHand: number;
  qtyInTransit: number;
  sales: Record<string, unknown>[];
  held: Record<string, unknown>[];
  favouritesJson: string;
  movements: Record<string, unknown>[];
  transfers: Record<string, unknown>[];
  counts: Record<string, unknown>[];
  pendingAdjustmentId: string | null;
  suppliers: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }>;
  supplierProducts: Array<{
    productId: string;
    supplierCode: string | null;
    lastPrice: number | null;
  }>;
  purchaseOrders: Array<{
    id: string;
    supplierId: string;
    deliverToLocationId: string;
    status: string;
    origin: string;
    originReferenceId: string | null;
    requiredBy: string | null;
    notes: string | null;
    total: number;
    etag?: string;
    lines: Array<{
      id: string;
      productId: string;
      variantId: string | null;
      description: string;
      orderedQty: number;
      receivedQty: number;
      damagedQty: number;
      unitCost: number;
    }>;
  }>;
  goodsReceipts: Array<{
    id: string;
    receiptNumber: string;
    purchaseOrderId: string;
    locationId: string;
    purchaseOrderStatus: string;
    lines: Array<Record<string, unknown>>;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    channel: string;
    title: string;
    message: string | null;
    occurrences: number;
    isRead: boolean;
    lastRaisedAt: string;
    resolvedAt: string | null;
  }>;
  notificationPreferences: Array<{
    type: string;
    channel: string;
    isEnabled: boolean;
    threshold: number | null;
  }>;
  reportSchedules: Array<{
    id: string;
    reportType: string;
    cadence: string;
    format: string;
    recipients: string[];
    nextRunAt: string;
    isActive: boolean;
  }>;
  exportJobs: Record<
    string,
    { status: "Pending" | "Ready" | "Failed"; attempts: number }
  >;
  staffUsers: Array<{
    id: string;
    email: string | null;
    name: string | null;
    roleId: string | null;
    locationScope: string | null;
    status: string;
    isOwner: boolean;
  }>;
  roles: Array<{
    id: string;
    name: string;
    permissions: string;
    maxDiscountPercent: number | null;
    maxUnauthorizedRefundAmount: number | null;
  }>;
  auditLog: Array<{
    id: string;
    actor: string;
    action: string;
    target: string | null;
    reason: string | null;
    occurredAt: string;
  }>;
  inviteTokens: Record<string, string>;
}

const state: ScenarioState = {
  checklist: {},
  locations: [],
  registers: [],
  products: [],
  qtyOnHand: 0,
  qtyInTransit: 0,
  sales: [],
  held: [],
  favouritesJson: "{}",
  movements: [],
  transfers: [],
  counts: [],
  pendingAdjustmentId: null,
  suppliers: [
    {
      id: "44444444-4444-4444-8444-444444444401",
      name: "Tema Wholesale",
      email: "orders@tema.gh",
      phone: "+233200000001",
    },
  ],
  supplierProducts: [],
  purchaseOrders: [],
  goodsReceipts: [],
  notifications: [
    {
      id: "b1111111-1111-4111-8111-111111111111",
      type: "LowStock",
      channel: "InApp",
      title: "Sugar 1kg is below reorder",
      message: "Qty on hand is low.",
      occurrences: 2,
      isRead: false,
      lastRaisedAt: new Date().toISOString(),
      resolvedAt: null,
    },
  ],
  notificationPreferences: [
    { type: "LowStock", channel: "InApp", isEnabled: true, threshold: 5 },
    { type: "LowStock", channel: "Email", isEnabled: false, threshold: 5 },
    { type: "LowStock", channel: "Push", isEnabled: false, threshold: 5 },
    { type: "Expiry", channel: "InApp", isEnabled: true, threshold: null },
  ],
  reportSchedules: [],
  exportJobs: {},
  staffUsers: [
    {
      id: USER_ID,
      email: "owner@kwame.gh",
      name: "Kwame Owner",
      roleId: "11111111-aaaa-4111-8111-111111111111",
      locationScope: null,
      status: "Active",
      isOwner: true,
    },
  ],
  roles: [
    {
      id: "11111111-aaaa-4111-8111-111111111111",
      name: "Owner",
      permissions: "ManageUsers,ViewReports,ViewProfit",
      maxDiscountPercent: 100,
      maxUnauthorizedRefundAmount: null,
    },
    {
      id: "22222222-aaaa-4222-8222-222222222222",
      name: "Cashier",
      permissions: "Sell",
      maxDiscountPercent: 5,
      maxUnauthorizedRefundAmount: 50,
    },
  ],
  auditLog: [
    {
      id: "a1111111-1111-4111-8111-111111111111",
      actor: "owner@kwame.gh",
      action: "UserInvited",
      target: "cashier@kwame.gh",
      reason: "Onboarding",
      occurredAt: new Date().toISOString(),
    },
  ],
  inviteTokens: {},
};

function tenant() {
  return {
    id: TENANT_ID,
    name: "Kwame Provisions",
    country: "GH",
    currency: "GHS",
    businessType: "Retail",
    valuationMethod: "WeightedAverage",
    onboardingChecklist: JSON.stringify(state.checklist),
    sampleDataLoaded: false,
    adjustmentApprovalThreshold: 250,
    poApprovalThreshold: 5000,
    tillVarianceThreshold: 20,
    returnAuthorizationThreshold: 100,
    requireExpiryOnBatchReceipt: true,
    billingEmail: "owner@kwame.gh",
    address: "12 Oxford Street, Accra",
    phone: "+233201234567",
  };
}

function sale(qty: number) {
  const unitPrice = 10;
  const subtotal = unitPrice * qty;
  const taxTotal = Number((subtotal * 0.15).toFixed(2));
  return {
    id: SALE_ID,
    clientSaleId: "b9999999-9999-4999-8999-999999999999",
    locationId: LOCATION_ID,
    registerId: REGISTER_ID,
    shiftId: SHIFT_ID,
    cashierId: "owner@kwame.gh",
    status: "Completed",
    subtotal,
    discountTotal: 0,
    taxTotal,
    grandTotal: subtotal + taxTotal,
    changeDue: 2,
    stockConflictFlag: false,
    occurredAt: new Date().toISOString(),
    lines: [
      {
        id: "d9999999-9999-4999-8999-999999999999",
        productId: PRODUCT_ID,
        variantId: null,
        batchId: null,
        productName: "Sugar 1kg",
        qty,
        unitPrice,
        lineDiscount: 0,
        taxAmount: taxTotal,
        lineTotal: subtotal + taxTotal,
        taxComponents: '[{"name":"VAT","amount":3}]',
        note: null,
      },
    ],
    payments: [{ tender: "Cash", amount: 25, reference: null }],
  };
}

export function resetUs1Scenario(): void {
  state.checklist = {};
  state.locations = [];
  state.registers = [];
  state.products = [];
  state.qtyOnHand = 0;
  state.qtyInTransit = 0;
  state.sales = [];
  state.held = [];
  state.favouritesJson = "{}";
  state.movements = [];
  state.transfers = [];
  state.counts = [];
  state.pendingAdjustmentId = null;
}

export const us1ScenarioHandlers = [
  http.post("*/api/v1/auth/register", () =>
    HttpResponse.json(
      {
        tenantId: TENANT_ID,
        businessName: "Kwame Provisions",
        subscriptionStatus: "Trialing",
        accessToken: accessToken(),
        accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        refreshToken: "refresh-token",
      },
      { status: 201 },
    ),
  ),
  http.post("*/api/v1/auth/login", () =>
    HttpResponse.json({
      requiresTwoFactor: false,
      accessToken: accessToken(),
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      refreshToken: "refresh-token",
    }),
  ),
  http.post("*/api/v1/auth/refresh", () =>
    HttpResponse.json({
      accessToken: accessToken(),
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      refreshToken: "refresh-token",
    }),
  ),
  http.post("*/api/v1/auth/pin/exchange", async ({ request }) => {
    const body = (await request.json()) as {
      userId?: string;
      pin?: string;
      registerId?: string;
    };
    if (!body.userId || !body.pin || !body.registerId) {
      return HttpResponse.json(
        { title: "Invalid request", status: 400 },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      accessToken: accessToken(),
      tokenType: "Bearer",
    });
  }),

  http.get("*/api/v1/tenant", () => HttpResponse.json(tenant())),
  http.patch("*/api/v1/tenant", async ({ request }) => {
    const body = (await request.json()) as { onboardingChecklist?: string };
    if (body.onboardingChecklist) {
      state.checklist = JSON.parse(body.onboardingChecklist) as Record<string, boolean>;
    }
    return HttpResponse.json(tenant());
  }),
  http.get("*/api/v1/subscription", () =>
    HttpResponse.json({
      plan: "Professional",
      status: "Trialing",
      trialEndsAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      locationLimit: 3,
      userLimit: 10,
      productLimit: 5000,
      locationCount: state.locations.length,
      userCount: 1,
      productCount: state.products.length,
    }),
  ),

  http.get("*/api/v1/locations", () => HttpResponse.json(state.locations)),
  http.post("*/api/v1/locations", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      address?: string;
      kind: string;
    };
    const record = {
      id: state.locations.length === 0 ? LOCATION_ID : LOCATION_B_ID,
      name: body.name,
      address: body.address ?? "",
      kind: body.kind,
      isActive: true,
    };
    state.locations = [...state.locations, record];
    return HttpResponse.json(record, { status: 201 });
  }),

  http.get("*/api/v1/categories", () =>
    HttpResponse.json([
      { id: CATEGORY_ID, name: "Groceries", parentId: null, children: [] },
    ]),
  ),
  http.get("*/api/v1/tax-treatments", () =>
    HttpResponse.json([
      {
        id: "66666666-6666-4666-8666-666666666666",
        code: "GH-STD",
        name: "Ghana standard",
        countryCode: "GH",
        componentsJson: '[{"name":"VAT","rate":0.15}]',
      },
    ]),
  ),

  http.get("*/api/v1/products", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
    const items = state.products.filter((product) => {
      if (search === "") return true;
      const hay =
        `${String(product["name"])} ${String(product["sku"])} ${String(product["barcode"])}`.toLowerCase();
      if (hay.includes(search)) return true;
      return search === "sugr" && hay.includes("sugar");
    });
    return HttpResponse.json({
      items,
      page: 1,
      pageSize: 50,
      totalCount: items.length,
    });
  }),
  http.get("*/api/v1/products/barcode/:barcode", ({ params }) => {
    const match = state.products.find(
      (product) => product["barcode"] === params["barcode"],
    );
    if (!match) {
      return HttpResponse.json(
        { title: "No product matches this barcode.", status: 404 },
        { status: 404, headers: { "Content-Type": "application/problem+json" } },
      );
    }
    return HttpResponse.json(match);
  }),
  http.post("*/api/v1/products", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const ids = [PRODUCT_ID, RICE_ID, OIL_ID];
    const record = {
      id: ids[state.products.length] ?? crypto.randomUUID(),
      name: body["name"],
      description: null,
      sku: body["sku"],
      barcode: body["barcode"] ?? null,
      categoryId: body["categoryId"] ?? null,
      unitOfMeasure: "Each",
      allowFractional: false,
      sellingPrice: Number(body["sellingPrice"]),
      costPrice: Number(body["costPrice"]),
      taxTreatmentCode: body["taxTreatmentCode"] ?? null,
      trackingMode: body["trackingMode"] ?? "Simple",
      status: "Active",
      reorderPoint: null,
      reorderQuantity: null,
      leadTimeDays: null,
      variantAttributes: [],
      variants: [],
    };
    state.products = [...state.products, record];
    return HttpResponse.json(record, { status: 201 });
  }),

  http.get("*/api/v1/stock", ({ request }) => {
    const url = new URL(request.url);
    const groupBy = url.searchParams.get("groupBy");
    const items =
      groupBy === "product"
        ? [
            {
              productId: PRODUCT_ID,
              productName: "Sugar 1kg",
              variantId: null,
              locationId: null,
              batchId: null,
              qtyOnHand: state.qtyOnHand,
              qtyInTransit: state.qtyInTransit,
              qtyQuarantine: 0,
              avgUnitCost: null,
            },
          ]
        : state.products.map((product) => ({
            productId: product["id"],
            productName: product["name"],
            variantId: null,
            locationId: LOCATION_ID,
            batchId: null,
            qtyOnHand: state.qtyOnHand,
            qtyInTransit: state.qtyInTransit,
            qtyQuarantine: 0,
            avgUnitCost: 6,
          }));
    return HttpResponse.json({
      items,
      page: 1,
      pageSize: 50,
      totalCount: items.length,
    });
  }),
  http.post("*/api/v1/stock/adjustments", async ({ request }) => {
    const body = (await request.json()) as {
      lines: { qtyDelta: string; productId: string }[];
      reasonCode?: string;
      note?: string;
    };
    const delta = body.lines.reduce((total, line) => total + Number(line.qtyDelta), 0);
    if (Math.abs(delta) >= 50) {
      state.pendingAdjustmentId = "a1111111-1111-4111-8111-111111111111";
      return HttpResponse.json({
        status: "PendingApproval",
        movementProductIds: [],
        adjustmentId: state.pendingAdjustmentId,
      });
    }
    state.qtyOnHand += delta;
    state.movements = [
      ...state.movements,
      {
        id: crypto.randomUUID(),
        type: "Adjustment",
        productId: body.lines[0]?.productId ?? PRODUCT_ID,
        variantId: null,
        batchId: null,
        locationId: LOCATION_ID,
        qtyDelta: delta,
        reasonCode: body.reasonCode ?? "Correction",
        note: body.note ?? null,
        userId: "owner@kwame.gh",
        occurredAt: new Date().toISOString(),
        correlationId: null,
      },
    ];
    return HttpResponse.json({
      status: "Applied",
      movementProductIds: [PRODUCT_ID],
      adjustmentId: null,
    });
  }),

  http.get("*/api/v1/registers", () =>
    HttpResponse.json(state.registers, {
      headers: { ETag: '"registers-list"' },
    }),
  ),
  http.get("*/api/v1/shifts", () => HttpResponse.json([])),
  http.get("*/api/v1/registers/:registerId/shifts", () => HttpResponse.json([])),
  http.post("*/api/v1/registers", async ({ request }) => {
    const body = (await request.json()) as { name: string; locationId: string };
    const record = {
      id: state.registers.length === 0 ? REGISTER_ID : crypto.randomUUID(),
      locationId: body.locationId,
      name: body.name,
      isActive: true,
    };
    state.registers = [...state.registers, record];
    return HttpResponse.json(record, { status: 201 });
  }),
  http.patch("*/api/v1/registers/:id", async ({ params, request }) => {
    const body = (await request.json()) as { name?: string | null; isActive?: boolean | null };
    const ifMatch = request.headers.get("If-Match");
    if (ifMatch && ifMatch !== '"registers-list"' && ifMatch !== '"register-updated"') {
      return HttpResponse.json(
        { title: "Conflict", status: 409, detail: "Register was updated elsewhere." },
        { status: 409 },
      );
    }
    const index = state.registers.findIndex((register) => register.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ title: "Not found", status: 404 }, { status: 404 });
    }
    const current = state.registers[index]!;
    const updated = {
      ...current,
      ...(body.name != null ? { name: body.name } : {}),
      ...(body.isActive != null ? { isActive: body.isActive } : {}),
    };
    state.registers = state.registers.map((register) =>
      register.id === params.id ? updated : register,
    );
    return HttpResponse.json(updated, { headers: { ETag: '"register-updated"' } });
  }),
  http.get("*/api/v1/sync/snapshot", ({ request }) => {
    const registerId =
      new URL(request.url).searchParams.get("registerId") ?? REGISTER_ID;
    return HttpResponse.json({
      watermark: "live-smoke=",
      registerId,
      locationId: LOCATION_ID,
      bundleVersion: "2026.08.gap.1",
      products: [
        {
          id: PRODUCT_ID,
          name: "Sugar 1kg",
          sellingPrice: 12.5,
          allowFractional: false,
          trackingMode: "Simple",
          version: "1",
        },
      ],
      taxTreatments: [],
      stock: [
        {
          productId: PRODUCT_ID,
          qtyOnHand: 10,
          qtyInTransit: 0,
          qtyQuarantine: 0,
          version: "1",
        },
      ],
      favourites: null,
      receiptTemplate: null,
      deleted: [],
    });
  }),
  http.post("*/api/v1/registers/:registerId/shifts", async ({ request }) => {
    const body = (await request.json()) as { openingFloat: string };
    return HttpResponse.json(
      {
        id: SHIFT_ID,
        registerId: REGISTER_ID,
        openedBy: "owner@kwame.gh",
        openedAt: new Date().toISOString(),
        openingFloat: Number(body.openingFloat),
        status: "Open",
      },
      { status: 201 },
    );
  }),

  http.post("*/api/v1/sales", async ({ request }) => {
    const body = (await request.json()) as {
      status?: string;
      lines: { qty: string; productId: string }[];
      payments?: { tender: string; amount: string; reference?: string }[];
      clientSaleId?: string;
    };
    const qty = body.lines.reduce((total, line) => total + Number(line.qty), 0);
    if (body.status === "Held") {
      const held = {
        ...sale(qty),
        id: crypto.randomUUID(),
        status: "Held",
        payments: [],
      };
      state.held = [...state.held, held];
      return HttpResponse.json(held, { status: 201 });
    }
    state.qtyOnHand -= qty;
    const completed = {
      ...sale(qty),
      clientSaleId: body.clientSaleId ?? "b9999999-9999-4999-8999-999999999999",
      payments: body.payments ?? [{ tender: "Cash", amount: 25, reference: null }],
    };
    state.sales = [...state.sales, completed];
    return HttpResponse.json(completed, { status: 201 });
  }),
  http.get("*/api/v1/sales", () =>
    HttpResponse.json({
      items: state.sales,
      page: 1,
      pageSize: 50,
      totalCount: state.sales.length,
    }),
  ),
  http.get("*/api/v1/sales/:id/receipt", () =>
    HttpResponse.json({
      id: RECEIPT_ID,
      saleId: SALE_ID,
      number: "RCP-000001",
      payloadJson: JSON.stringify({ lines: 1 }),
      createdAt: new Date().toISOString(),
    }),
  ),

  http.get("*/api/v1/tenant/receipt-template", () =>
    HttpResponse.json({
      templateJson: JSON.stringify({
        businessName: "Kwame Provisions",
        taxIdentifier: "GHA-123456789",
        footer: "Thank you for shopping with us",
      }),
    }),
  ),
  http.put("*/api/v1/tenant/receipt-template", async ({ request }) =>
    HttpResponse.json(await request.json()),
  ),

  http.get("*/api/v1/registers/:registerId/favourites", () =>
    HttpResponse.json({
      registerId: REGISTER_ID,
      layoutJson: state.favouritesJson,
    }),
  ),
  http.put("*/api/v1/registers/:registerId/favourites", async ({ request }) => {
    const body = (await request.json()) as { layoutJson: string };
    state.favouritesJson = body.layoutJson;
    return HttpResponse.json({ registerId: REGISTER_ID, layoutJson: body.layoutJson });
  }),
  http.get("*/api/v1/sales/held", () => HttpResponse.json(state.held)),
  http.get("*/api/v1/sales/held/:id", ({ params }) => {
    const match = state.held.find((item) => item["id"] === params["id"]);
    return match
      ? HttpResponse.json(match)
      : HttpResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  }),
  http.post("*/api/v1/sales/:id/complete", async ({ params, request }) => {
    const body = (await request.json()) as {
      payments: { tender: string; amount: string }[];
    };
    const held = state.held.find((item) => item["id"] === params["id"]);
    state.held = state.held.filter((item) => item["id"] !== params["id"]);
    const completed = {
      ...(held ?? sale(1)),
      status: "Completed",
      payments: body.payments,
      changeDue: 1.05,
    };
    state.sales = [...state.sales, completed];
    return HttpResponse.json(completed);
  }),
  http.get("*/api/v1/sales/lookup", () => HttpResponse.json(state.sales)),
  http.post("*/api/v1/sales/:id/void", () =>
    HttpResponse.json({ ...(state.sales[0] ?? sale(1)), status: "Voided" }),
  ),
  http.post("*/api/v1/sales/:id/receipt/deliver", async ({ request }) => {
    const body = (await request.json()) as { channel: string; destination: string };
    return HttpResponse.json({
      saleId: SALE_ID,
      channel: body.channel,
      destination: body.destination,
      success: body.channel !== "Sms",
      message: body.channel === "Sms" ? "Carrier rejected the message." : "Queued",
    });
  }),
  http.post("*/api/v1/returns", () =>
    HttpResponse.json({
      id: "f1111111-1111-4111-8111-111111111111",
      originalSaleId: SALE_ID,
      exchangeSaleId: null,
      status: "Completed",
      authorizationRequired: false,
      authorizedBy: null,
      refundTender: "Original",
      refundTotal: 11.5,
      occurredAt: new Date().toISOString(),
      reason: null,
      lines: [],
    }),
  ),
  http.post("*/api/v1/returns/exchange", () =>
    HttpResponse.json({
      id: "f2222222-2222-4222-8222-222222222222",
      originalSaleId: SALE_ID,
      exchangeSaleId: "a6666666-6666-4666-8666-666666666666",
      status: "Completed",
      authorizationRequired: false,
      authorizedBy: null,
      refundTender: "Original",
      refundTotal: -8,
      occurredAt: new Date().toISOString(),
      reason: null,
      lines: [],
    }),
  ),

  http.get("*/api/v1/stock/movements", () =>
    HttpResponse.json({
      items: state.movements,
      page: 1,
      pageSize: 50,
      totalCount: state.movements.length,
    }),
  ),
  http.post("*/api/v1/stock/movements/:id/correct", async ({ params, request }) => {
    const body = (await request.json()) as {
      correctedQtyDelta: string;
      reasonCode: string;
      note?: string;
    };
    const original = state.movements.find((item) => item["id"] === params["id"]);
    const correction = {
      id: crypto.randomUUID(),
      type: "Adjustment",
      productId: original?.["productId"] ?? PRODUCT_ID,
      variantId: null,
      batchId: null,
      locationId: LOCATION_ID,
      qtyDelta: Number(body.correctedQtyDelta) - Number(original?.["qtyDelta"] ?? 0),
      reasonCode: body.reasonCode,
      note: body.note ?? null,
      userId: "owner@kwame.gh",
      occurredAt: new Date().toISOString(),
      correlationId: params["id"],
    };
    state.qtyOnHand += correction.qtyDelta;
    state.movements = [...state.movements, correction];
    return HttpResponse.json(correction);
  }),
  http.get("*/api/v1/stock/adjustment-reasons", () =>
    HttpResponse.json([
      {
        id: "11111111-1111-4111-8111-111111111108",
        code: "Correction",
        name: "Stock correction",
        isSystem: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222201",
        code: "Damage",
        name: "Damaged goods",
        isSystem: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222202",
        code: "PersonalUse",
        name: "Personal use",
        isSystem: true,
      },
    ]),
  ),
  http.post("*/api/v1/stock/adjustments/:id/approve", ({ params }) => {
    state.pendingAdjustmentId = null;
    state.qtyOnHand += 50;
    return HttpResponse.json({
      status: "Applied",
      movementProductIds: [PRODUCT_ID],
      adjustmentId: params["id"],
    });
  }),
  http.post("*/api/v1/stock/adjustments/:id/reject", () => {
    state.pendingAdjustmentId = null;
    return HttpResponse.json({
      status: "Rejected",
      movementProductIds: [],
      adjustmentId: null,
    });
  }),
  http.post("*/api/v1/stock/consumption", async ({ request }) => {
    const body = (await request.json()) as { lines: { qtyDelta: string }[] };
    for (const line of body.lines) state.qtyOnHand += Number(line.qtyDelta);
    return HttpResponse.json({
      status: "Applied",
      movementProductIds: [PRODUCT_ID],
      adjustmentId: null,
    });
  }),

  http.get("*/api/v1/transfers", ({ request }) => {
    const status = new URL(request.url).searchParams.get("status");
    const items = state.transfers.filter(
      (transfer) => !status || transfer["status"] === status,
    );
    return HttpResponse.json({
      items,
      page: 1,
      pageSize: 50,
      totalCount: items.length,
    });
  }),
  http.get("*/api/v1/transfers/:id", ({ params }) => {
    const match = state.transfers.find((transfer) => transfer["id"] === params["id"]);
    return match
      ? HttpResponse.json(match)
      : HttpResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  }),
  http.post("*/api/v1/transfers", async ({ request }) => {
    const body = (await request.json()) as {
      fromLocationId: string;
      toLocationId: string;
      lines: { productId: string; quantity: string }[];
    };
    const transfer = {
      id: crypto.randomUUID(),
      status: "Draft",
      discrepancyReason: null,
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      lines: body.lines.map((line) => ({
        id: crypto.randomUUID(),
        productId: line.productId,
        productName: "Sugar 1kg",
        qtyDispatched: Number(line.quantity),
        qtyReceived: null,
      })),
    };
    state.transfers = [...state.transfers, transfer];
    return HttpResponse.json(
      { id: transfer.id, status: transfer.status, discrepancyReason: null },
      { status: 201 },
    );
  }),
  http.post("*/api/v1/transfers/:id/dispatch", ({ params }) => {
    state.transfers = state.transfers.map((transfer) => {
      if (transfer["id"] !== params["id"]) return transfer;
      const qty =
        (transfer["lines"] as { qtyDispatched: number }[])[0]?.qtyDispatched ?? 0;
      state.qtyOnHand -= qty;
      state.qtyInTransit += qty;
      return { ...transfer, status: "Dispatched" };
    });
    return HttpResponse.json({
      id: params["id"],
      status: "Dispatched",
      discrepancyReason: null,
    });
  }),
  http.post("*/api/v1/transfers/:id/receive", async ({ params, request }) => {
    const body = (await request.json()) as {
      lines: { lineId: string; quantityReceived: string }[];
      discrepancyReason?: string;
    };
    const received = Number(body.lines[0]?.quantityReceived ?? 0);
    state.transfers = state.transfers.map((transfer) => {
      if (transfer["id"] !== params["id"]) return transfer;
      const lines = (
        transfer["lines"] as {
          id: string;
          qtyDispatched: number;
          productId: string;
          productName: string;
        }[]
      ).map((line) => ({ ...line, qtyReceived: received }));
      const dispatched = lines[0]?.qtyDispatched ?? 0;
      state.qtyInTransit -= dispatched;
      const status = received === dispatched ? "Received" : "ReceivedWithDiscrepancy";
      return {
        ...transfer,
        status,
        discrepancyReason: body.discrepancyReason ?? null,
        lines,
      };
    });
    const updated = state.transfers.find((transfer) => transfer["id"] === params["id"]);
    return HttpResponse.json({
      id: params["id"],
      status: updated?.["status"] ?? "Received",
      discrepancyReason: updated?.["discrepancyReason"] ?? null,
    });
  }),

  http.post("*/api/v1/counts", async ({ request }) => {
    const body = (await request.json()) as {
      locationId: string;
      scope: string;
      productIds: string[];
    };
    const count = {
      id: crypto.randomUUID(),
      scope: body.scope,
      status: "Open",
      locationId: body.locationId,
      lines: [
        {
          id: crypto.randomUUID(),
          productId: body.productIds[0] ?? PRODUCT_ID,
          expectedQty: state.qtyOnHand,
          countedQty: null,
          varianceQty: 0,
          varianceValue: 0,
        },
      ],
    };
    state.counts = [...state.counts, count];
    return HttpResponse.json(count, {
      status: 201,
      headers: { ETag: `"count-${count.id}"` },
    });
  }),
  http.get("*/api/v1/counts/:id", ({ params }) => {
    const match = state.counts.find((count) => count["id"] === params["id"]);
    return match
      ? HttpResponse.json(match, {
          headers: { ETag: `"count-${String(params["id"])}"` },
        })
      : HttpResponse.json({ title: "Not found", status: 404 }, { status: 404 });
  }),
  http.put("*/api/v1/counts/:id/lines", async ({ params, request }) => {
    const body = (await request.json()) as {
      lines: { lineId: string; countedQty: string }[];
    };
    state.counts = state.counts.map((count) => {
      if (count["id"] !== params["id"]) return count;
      const counted = Number(body.lines[0]?.countedQty ?? 0);
      const lines = (
        count["lines"] as {
          id: string;
          productId: string;
          expectedQty: number;
        }[]
      ).map((line) => ({
        ...line,
        countedQty: counted,
        varianceQty: counted - line.expectedQty,
        varianceValue: (counted - line.expectedQty) * 6,
      }));
      return { ...count, lines };
    });
    const match = state.counts.find((count) => count["id"] === params["id"]);
    return HttpResponse.json(match, {
      headers: { ETag: `"count-${String(params["id"])}-2"` },
    });
  }),
  http.post("*/api/v1/counts/:id/submit", ({ params }) => {
    state.counts = state.counts.map((count) =>
      count["id"] === params["id"] ? { ...count, status: "Submitted" } : count,
    );
    return HttpResponse.json(
      state.counts.find((count) => count["id"] === params["id"]),
    );
  }),
  http.post("*/api/v1/counts/:id/approve", ({ params }) => {
    const match = state.counts.find((count) => count["id"] === params["id"]);
    const line = (
      match?.["lines"] as { varianceQty: number; productId: string }[] | undefined
    )?.[0];
    if (line) state.qtyOnHand += line.varianceQty;
    state.counts = state.counts.map((count) =>
      count["id"] === params["id"] ? { ...count, status: "Approved" } : count,
    );
    return HttpResponse.json(
      state.counts.find((count) => count["id"] === params["id"]),
    );
  }),
  http.post("*/api/v1/counts/:id/reject", ({ params }) => {
    state.counts = state.counts.map((count) =>
      count["id"] === params["id"] ? { ...count, status: "Rejected" } : count,
    );
    return HttpResponse.json(
      state.counts.find((count) => count["id"] === params["id"]),
    );
  }),

  http.get("*/api/v1/alerts", () =>
    HttpResponse.json([
      {
        id: "33333333-3333-4333-8333-333333333301",
        type: "LowStock",
        title: "Sugar 1kg is below reorder",
        body: "Qty on hand is low.",
        channel: "InApp",
        lastRaisedAt: new Date().toISOString(),
        resolvedAt: null,
      },
    ]),
  ),
  http.get("*/api/v1/reorder/suggestions", () =>
    HttpResponse.json({
      items: [
        {
          productId: PRODUCT_ID,
          productName: "Sugar 1kg",
          sku: "SUG-001",
          supplierId: "44444444-4444-4444-8444-444444444401",
          supplierName: "Tema Wholesale",
          currentStock: state.qtyOnHand,
          reorderPoint: 5,
          suggestedQty: 20,
          leadTimeDays: 3,
          unitCost: 6,
        },
      ],
    }),
  ),

  http.get("*/api/v1/suppliers", () => HttpResponse.json(state.suppliers)),
  http.post("*/api/v1/suppliers", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email?: string;
      phone?: string;
    };
    const supplier = {
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
    };
    state.suppliers.push(supplier);
    return HttpResponse.json(supplier, { status: 201 });
  }),
  http.get("*/api/v1/suppliers/:id/products", () =>
    HttpResponse.json(state.supplierProducts),
  ),
  http.put("*/api/v1/suppliers/:id/products", async ({ request }) => {
    state.supplierProducts = (await request.json()) as typeof state.supplierProducts;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/v1/suppliers/:id/orders", ({ params }) =>
    HttpResponse.json(
      state.purchaseOrders.filter((order) => order.supplierId === params["id"]),
    ),
  ),
  http.get("*/api/v1/suppliers/:id/performance", () =>
    HttpResponse.json({ onTimeRate: 0.92, fillRate: 0.97, averageLeadTimeDays: 3 }),
  ),

  http.post("*/api/v1/reorder/suggestions/apply", async ({ request }) => {
    const body = (await request.json()) as {
      deliverToLocationId: string;
      selections: Array<{
        productId: string;
        supplierId: string;
        qty: number;
        unitCost: number;
      }>;
    };
    const bySupplier = new Map<string, typeof body.selections>();
    for (const selection of body.selections) {
      const current = bySupplier.get(selection.supplierId) ?? [];
      current.push(selection);
      bySupplier.set(selection.supplierId, current);
    }
    const created = [...bySupplier.entries()].map(([supplierId, selections]) => {
      const lines = selections.map((selection) => ({
        id: crypto.randomUUID(),
        productId: selection.productId,
        variantId: null,
        description: "Reorder item",
        orderedQty: selection.qty,
        receivedQty: 0,
        damagedQty: 0,
        unitCost: selection.unitCost,
      }));
      const order = {
        id: crypto.randomUUID(),
        supplierId,
        deliverToLocationId: body.deliverToLocationId,
        status: "Draft",
        origin: "ReorderSuggestion",
        originReferenceId: null,
        requiredBy: null,
        notes: null,
        total: lines.reduce((sum, line) => sum + line.orderedQty * line.unitCost, 0),
        lines,
      };
      state.purchaseOrders.unshift(order);
      return order;
    });
    return HttpResponse.json(created);
  }),

  http.get("*/api/v1/purchase-orders", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const items = status
      ? state.purchaseOrders.filter((order) => order.status === status)
      : state.purchaseOrders;
    return HttpResponse.json({
      items,
      page: 1,
      pageSize: 50,
      totalCount: items.length,
    });
  }),
  http.post("*/api/v1/purchase-orders", async ({ request }) => {
    const body = (await request.json()) as {
      supplierId: string;
      deliverToLocationId: string;
      origin?: string;
      notes?: string;
      lines: Array<{
        productId: string;
        description: string;
        orderedQty: number;
        unitCost: number;
      }>;
    };
    const lines = body.lines.map((line) => ({
      id: crypto.randomUUID(),
      productId: line.productId,
      variantId: null,
      description: line.description,
      orderedQty: line.orderedQty,
      receivedQty: 0,
      damagedQty: 0,
      unitCost: line.unitCost,
    }));
    const order = {
      id: crypto.randomUUID(),
      supplierId: body.supplierId,
      deliverToLocationId: body.deliverToLocationId,
      status: "Draft",
      origin: body.origin ?? "Manual",
      originReferenceId: null,
      requiredBy: null,
      notes: body.notes ?? null,
      total: lines.reduce((sum, line) => sum + line.orderedQty * line.unitCost, 0),
      lines,
      etag: '"po-v1"',
    };
    state.purchaseOrders.unshift(order);
    return HttpResponse.json(order, {
      status: 201,
      headers: { ETag: '"po-v1"' },
    });
  }),
  http.patch("*/api/v1/purchase-orders/:id", async ({ params, request }) => {
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    const ifMatch = request.headers.get("If-Match");
    const currentEtag = (order as { etag?: string }).etag ?? '"po-v1"';
    if (ifMatch && ifMatch !== currentEtag) {
      return HttpResponse.json({ title: "Precondition Failed" }, { status: 412 });
    }
    const body = (await request.json()) as { notes?: string | null };
    if (body.notes !== undefined) order.notes = body.notes;
    (order as { etag?: string }).etag = '"po-v2"';
    return HttpResponse.json(order, { headers: { ETag: '"po-v2"' } });
  }),
  http.post("*/api/v1/purchase-orders/:id/submit", ({ params }) => {
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    order.status = order.total > 5000 ? "AwaitingApproval" : "Sent";
    return HttpResponse.json(order);
  }),
  http.post("*/api/v1/purchase-orders/:id/approve", ({ params }) => {
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    order.status = "Sent";
    return HttpResponse.json(order);
  }),
  http.post("*/api/v1/purchase-orders/:id/reject", ({ params }) => {
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    order.status = "Cancelled";
    return HttpResponse.json(order);
  }),
  http.post("*/api/v1/purchase-orders/:id/cancel", async ({ params, request }) => {
    const body = (await request.json()) as { reason?: string };
    if (!body.reason) {
      return HttpResponse.json({ title: "Reason required" }, { status: 400 });
    }
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    order.status = "Cancelled";
    return HttpResponse.json(order);
  }),
  http.post("*/api/v1/purchase-orders/:id/send", ({ params }) => {
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    order.status = "Sent";
    return HttpResponse.json({ sent: true, to: "buyer@supplier.gh" });
  }),
  http.get(
    "*/api/v1/purchase-orders/:id/pdf",
    () =>
      new HttpResponse("%PDF-1.4 mock", {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
  ),
  http.post("*/api/v1/purchase-orders/:id/receipts", async ({ params, request }) => {
    const body = (await request.json()) as {
      locationId: string;
      lines: Array<{
        purchaseOrderLineId: string;
        qtyReceived: number;
        qtyDamaged: number;
        unitCost: number;
        batchNumber?: string;
      }>;
    };
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    for (const incoming of body.lines) {
      const line = order.lines.find((row) => row.id === incoming.purchaseOrderLineId);
      if (!line) continue;
      line.receivedQty += incoming.qtyReceived;
      line.damagedQty += incoming.qtyDamaged;
      state.qtyOnHand += incoming.qtyReceived;
    }
    const complete = order.lines.every(
      (line) => line.receivedQty + line.damagedQty >= line.orderedQty,
    );
    order.status = complete ? "FullyReceived" : "PartiallyReceived";
    const receipt = {
      id: crypto.randomUUID(),
      receiptNumber: `GR-${String(state.goodsReceipts.length + 1)}`,
      purchaseOrderId: order.id,
      locationId: body.locationId,
      purchaseOrderStatus: order.status,
      lines: body.lines.map((line) => ({
        id: crypto.randomUUID(),
        ...line,
        acceptedQty: line.qtyReceived,
      })),
    };
    state.goodsReceipts.push(receipt);
    return HttpResponse.json(receipt);
  }),
  http.post("*/api/v1/purchase-orders/:id/close-short", async ({ params, request }) => {
    const body = (await request.json()) as { reason?: string };
    if (!body.reason?.trim()) {
      return HttpResponse.json({ title: "Reason required" }, { status: 400 });
    }
    const order = state.purchaseOrders.find((row) => row.id === params["id"]);
    if (!order) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    order.status = "Closed";
    return HttpResponse.json(order);
  }),
  http.post("*/api/v1/supplier-invoices", async ({ request }) => {
    const body = (await request.json()) as {
      supplierId: string;
      purchaseOrderId?: string;
      invoiceNumber: string;
      lines: Array<{ productId: string; qty: number; unitPrice: number }>;
    };
    const order = state.purchaseOrders.find((row) => row.id === body.purchaseOrderId);
    const lines = body.lines.map((line) => {
      const ordered = order?.lines.find((row) => row.productId === line.productId);
      const orderedUnitCost = ordered?.unitCost ?? null;
      return {
        productId: line.productId,
        unitPrice: line.unitPrice,
        orderedUnitCost,
        hasVariance: orderedUnitCost != null && orderedUnitCost !== line.unitPrice,
      };
    });
    return HttpResponse.json({
      id: crypto.randomUUID(),
      invoiceNumber: body.invoiceNumber,
      hasPriceVariance: lines.some((line) => line.hasVariance),
      lines,
    });
  }),
  http.post("*/api/v1/goods-receipts/:id/landed-costs", async ({ params, request }) => {
    const body = (await request.json()) as { costType: string; totalAmount: number };
    const receipt = state.goodsReceipts.find((row) => row.id === params["id"]);
    if (!receipt) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    const first = receipt.lines[0] as
      | { id?: string; qtyReceived?: number; unitCost?: number; productId?: string }
      | undefined;
    const allocated = body.totalAmount;
    const qty = first?.qtyReceived || 1;
    const baseCost = first?.unitCost ?? 6;
    return HttpResponse.json({
      goodsReceiptId: receipt.id,
      lines: [
        {
          goodsReceiptLineId: first?.id ?? crypto.randomUUID(),
          productId: first?.productId ?? PRODUCT_ID,
          allocatedAmount: allocated,
          newUnitCost: Number((baseCost + allocated / qty).toFixed(4)),
        },
      ],
    });
  }),

  http.get("*/api/v1/dashboard", () =>
    HttpResponse.json({
      sales: { today: 120, sameDayLastWeek: 90, detailUrl: "/api/v1/reports/sales" },
      transactionCount: {
        today: 4,
        sameDayLastWeek: 3,
        detailUrl: "/api/v1/reports/sales",
      },
      averageBasket: {
        today: 30,
        sameDayLastWeek: 28,
        detailUrl: "/api/v1/reports/sales",
      },
      itemsSold: { today: 12, sameDayLastWeek: 10, detailUrl: "/api/v1/reports/sales" },
      cashInDrawer: {
        today: 80,
        sameDayLastWeek: 70,
        detailUrl: "/api/v1/reports/staff",
      },
      lowStockWarnings: 1,
      expiryWarnings: 0,
      topSellers: [
        {
          productId: PRODUCT_ID,
          productName: "Sugar 1kg",
          quantity: 8,
          sales: 80,
          detailUrl: "/api/v1/reports/sales",
        },
      ],
      grossProfit: 40,
    }),
  ),
  http.get("*/api/v1/reports/sales", () =>
    HttpResponse.json({
      totalSales: 120,
      transactions: 1,
      rows: [
        {
          saleId: SALE_ID,
          occurredAt: new Date().toISOString(),
          locationId: LOCATION_ID,
          staffId: USER_ID,
          subtotal: 100,
          discount: 0,
          tax: 20,
          total: 120,
          status: "Completed",
        },
      ],
    }),
  ),
  http.get("*/api/v1/reports/profit", () =>
    HttpResponse.json({
      grossProfit: 40,
      rows: [
        {
          productId: PRODUCT_ID,
          productName: "Sugar 1kg",
          revenue: 120,
          cost: 80,
          grossProfit: 40,
        },
      ],
    }),
  ),
  http.get("*/api/v1/reports/stock", () =>
    HttpResponse.json({
      totalValue: 60,
      rows: [
        {
          productId: PRODUCT_ID,
          productName: "Sugar 1kg",
          locationId: LOCATION_ID,
          onHand: 10,
          unitCost: 6,
          value: 60,
        },
      ],
    }),
  ),
  http.get("*/api/v1/reports/purchasing", () =>
    HttpResponse.json({
      rows: [
        {
          purchaseOrderId: "55555555-5555-4555-8555-555555555555",
          supplierId: "44444444-4444-4444-8444-444444444401",
          supplierName: "Tema Wholesale",
          status: "Sent",
          requiredBy: null,
          orderedValue: 120,
          outstandingQuantity: 10,
        },
      ],
    }),
  ),
  http.get("*/api/v1/reports/staff", () =>
    HttpResponse.json({
      rows: [{ staffId: USER_ID, transactions: 4, sales: 120, discounts: 0, voids: 0 }],
    }),
  ),
  http.get("*/api/v1/reports/tax", () =>
    HttpResponse.json({
      from: new Date().toISOString(),
      to: new Date().toISOString(),
      totalTax: 20,
      components: [{ code: "GH-STD", name: "Standard VAT", rate: 0.15, amount: 20 }],
    }),
  ),
  http.get("*/api/v1/reports/schedules", () =>
    HttpResponse.json({
      items: state.reportSchedules,
      totalCount: state.reportSchedules.length,
    }),
  ),
  http.post("*/api/v1/reports/schedules", async ({ request }) => {
    const body = (await request.json()) as {
      reportType: string;
      cadence: string;
      format: string;
      recipients: string[];
    };
    const schedule = {
      id: crypto.randomUUID(),
      reportType: body.reportType,
      cadence: body.cadence,
      format: body.format,
      recipients: body.recipients,
      nextRunAt: new Date(Date.now() + 86_400_000).toISOString(),
      isActive: true,
    };
    state.reportSchedules.unshift(schedule);
    return HttpResponse.json(schedule, { status: 201 });
  }),
  http.get("*/api/v1/reports/schedules/:id", ({ params }) => {
    const schedule = state.reportSchedules.find((row) => row.id === params["id"]);
    if (!schedule) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    return HttpResponse.json(schedule);
  }),
  http.delete("*/api/v1/reports/schedules/:id", ({ params }) => {
    const schedule = state.reportSchedules.find((row) => row.id === params["id"]);
    if (!schedule) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    schedule.isActive = false;
    return HttpResponse.json(true);
  }),
  http.get("*/api/v1/reports/:reportType/export", () => {
    const jobId = crypto.randomUUID();
    state.exportJobs[jobId] = { status: "Pending", attempts: 0 };
    return HttpResponse.json({ jobId, status: "Pending" }, { status: 202 });
  }),
  http.get("*/api/v1/reports/export-jobs/:id", ({ params }) => {
    const job = state.exportJobs[String(params["id"])];
    if (!job) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    job.attempts += 1;
    if (job.attempts < 2) {
      return HttpResponse.json(
        { jobId: params["id"], status: "Pending" },
        { status: 202 },
      );
    }
    job.status = "Ready";
    return new HttpResponse("sale_id,total\n1,120\n", {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="sales.csv"',
      },
    });
  }),
  http.get(
    "*/api/v1/export/stock",
    () =>
      new HttpResponse("product,on_hand\nSugar,10\n", {
        headers: { "Content-Type": "text/csv" },
      }),
  ),
  http.get("*/api/v1/notifications", () =>
    HttpResponse.json({
      items: state.notifications,
      totalCount: state.notifications.length,
    }),
  ),
  http.post("*/api/v1/notifications/:id/read", ({ params }) => {
    const item = state.notifications.find((row) => row.id === params["id"]);
    if (!item) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    item.isRead = true;
    return HttpResponse.json(true);
  }),
  http.post("*/api/v1/notifications/read-all", () => {
    let count = 0;
    for (const item of state.notifications) {
      if (!item.isRead) {
        item.isRead = true;
        count += 1;
      }
    }
    return HttpResponse.json(count);
  }),
  http.get("*/api/v1/notification-preferences", () =>
    HttpResponse.json(state.notificationPreferences),
  ),
  http.put("*/api/v1/notification-preferences", async ({ request }) => {
    const body = (await request.json()) as {
      preferences?: typeof state.notificationPreferences;
    };
    if (body.preferences) state.notificationPreferences = body.preferences;
    return HttpResponse.json(state.notificationPreferences);
  }),

  http.get("*/api/v1/users", () => HttpResponse.json(state.staffUsers)),
  http.get("*/api/v1/roles", () => HttpResponse.json(state.roles)),
  http.post("*/api/v1/users/invitations", async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      roleId?: string;
      locationScope?: string;
    };
    if (state.staffUsers.length >= 20) {
      return HttpResponse.json({ title: "Invitation limit" }, { status: 422 });
    }
    const id = crypto.randomUUID();
    const token = `invite-${id.slice(0, 8)}`;
    state.inviteTokens[id] = token;
    state.staffUsers.push({
      id,
      email: body.email,
      name: null,
      roleId:
        body.roleId ?? state.roles.find((role) => role.name === "Cashier")?.id ?? null,
      locationScope: body.locationScope ?? null,
      status: "Invited",
      isOwner: false,
    });
    state.auditLog.unshift({
      id: crypto.randomUUID(),
      actor: "owner@kwame.gh",
      action: "UserInvited",
      target: body.email,
      reason: null,
      occurredAt: new Date().toISOString(),
    });
    return HttpResponse.json({ id, token }, { status: 201 });
  }),
  http.post("*/api/v1/users/invitations/:id/accept", async ({ params, request }) => {
    const body = (await request.json()) as { token?: string; password?: string };
    const user = state.staffUsers.find((row) => row.id === params["id"]);
    if (!user || user.status !== "Invited") {
      return HttpResponse.json({ title: "Not found" }, { status: 404 });
    }
    if (!body.token || state.inviteTokens[user.id] !== body.token || !body.password) {
      return HttpResponse.json({ title: "Invalid token" }, { status: 400 });
    }
    user.status = "Active";
    return new HttpResponse(null, { status: 204 });
  }),
  http.patch("*/api/v1/users/:id", async ({ params, request }) => {
    const user = state.staffUsers.find((row) => row.id === params["id"]);
    if (!user) return HttpResponse.json({ title: "Not found" }, { status: 404 });
    const body = (await request.json()) as {
      roleId?: string;
      locationScope?: string;
      status?: string;
    };
    if (user.isOwner && body.status === "Inactive") {
      return HttpResponse.json({ title: "Sole owner" }, { status: 409 });
    }
    if (body.roleId !== undefined) user.roleId = body.roleId;
    if (body.locationScope !== undefined) user.locationScope = body.locationScope;
    if (body.status !== undefined) user.status = body.status;
    state.auditLog.unshift({
      id: crypto.randomUUID(),
      actor: "owner@kwame.gh",
      action: "UserUpdated",
      target: user.email,
      reason: body.status === "Inactive" ? "Deactivated" : "Scope change",
      occurredAt: new Date().toISOString(),
    });
    return new HttpResponse(null, { status: 204 });
  }),
  http.put("*/api/v1/users/:userId/pin", async ({ params, request }) => {
    const body = (await request.json()) as { pin?: string };
    if (!body.pin || body.pin.length < 4) {
      return HttpResponse.json({ title: "PIN required" }, { status: 400 });
    }
    state.auditLog.unshift({
      id: crypto.randomUUID(),
      actor: "owner@kwame.gh",
      action: "RegisterPinSet",
      target: String(params["userId"]),
      reason: null,
      occurredAt: new Date().toISOString(),
    });
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/v1/audit-log", ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "50");
    return HttpResponse.json({
      items: state.auditLog,
      page,
      pageSize,
      totalCount: state.auditLog.length,
    });
  }),
  http.post("*/api/v1/auth/2fa/enroll", () =>
    HttpResponse.json({
      sharedKey: "JBSWY3DPEHPK3PXP",
      authenticatorUri:
        "otpauth://totp/InventoryMS:owner@kwame.gh?secret=JBSWY3DPEHPK3PXP",
    }),
  ),

  http.get("*/api/v1/products/:id/batches", () =>
    HttpResponse.json([
      {
        id: "d1111111-1111-4111-8111-111111111111",
        batchNumber: "BATCH-1",
        qty: 8,
        expiresAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        manufacturedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
        damagedQty: 1,
      },
      {
        id: "d2222222-2222-4222-8222-222222222222",
        batchNumber: "BATCH-2",
        qty: 12,
        expiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString(),
        manufacturedAt: null,
        damagedQty: 0,
      },
    ]),
  ),
  http.get("*/api/v1/batches/:id/trace", ({ params }) =>
    HttpResponse.json({
      batchId: params["id"],
      batchNumber: "BATCH-1",
      productId: PRODUCT_ID,
      expiresAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      supplier: {
        id: "44444444-4444-4444-8444-444444444401",
        name: "Tema Wholesale",
        email: "orders@tema.gh",
        phone: null,
      },
      receipts: [
        {
          id: "e1111111-1111-4111-8111-111111111111",
          receiptNumber: "GR-1",
          receivedAt: new Date().toISOString(),
          quantity: 10,
          damagedQuantity: 1,
          locationId: LOCATION_ID,
        },
      ],
      sales: [
        {
          id: SALE_ID,
          occurredAt: new Date().toISOString(),
          quantity: 2,
          cashierId: USER_ID,
          locationId: LOCATION_ID,
        },
      ],
    }),
  ),
];
