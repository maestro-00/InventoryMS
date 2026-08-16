export const rfc7807Problem = {
  type: "https://inventoryx.dev/problems/validation",
  title: "Validation failed",
  status: 400,
  detail: "One or more fields are invalid.",
  instance: "/api/v1/products",
  traceId: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
  errors: {
    sku: ["SKU must be unique within the tenant."],
  },
} as const;

export const authSessionFixture = {
  userId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  role: "Owner",
  permissions: ["ManageStock", "Sell", "ViewReports", "ViewProfit"],
  locationScope: ["33333333-3333-4333-8333-333333333333"],
  expiresAt: "2026-08-13T12:00:00.000Z",
} as const;

export const permissionMatrixFixture = {
  Owner: ["ManageStock", "Sell", "ViewReports", "ViewProfit", "ManageUsers"],
  Cashier: ["Sell"],
} as const;

export const productFixture = {
  productId: "44444444-4444-4444-8444-444444444444",
  name: "Bottled water",
  sku: "WAT-500",
  barcode: "6001234567890",
  tracking: "Simple",
  sellingPrice: "2.50",
  allowFractional: false,
} as const;

export const stockFixture = {
  productId: productFixture.productId,
  locationId: "33333333-3333-4333-8333-333333333333",
  onHand: "10.000",
  inTransit: "0.000",
} as const;

export const saleFixture = {
  clientSaleId: "55555555-5555-4555-8555-555555555555",
  grandTotal: "5.00",
  tax: "0.00",
  tenders: [{ tender: "Cash", amount: "5.00" }],
} as const;

export const billingPlanFixture = {
  plan: "Professional",
  status: "Trialing",
  trialEndsAt: "2026-08-27T00:00:00.000Z",
} as const;

export const purchasingOrderFixture = {
  purchaseOrderId: "66666666-6666-4666-8666-666666666666",
  status: "Draft",
  total: "120.00",
} as const;

export const reportFixture = {
  kind: "sales",
  range: { from: "2026-08-01", to: "2026-08-12" },
  rows: [{ location: "Accra Shop", total: "1500.00" }],
} as const;
