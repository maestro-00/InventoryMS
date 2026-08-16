/**
 * Provider-state fixtures shaped exactly like the InventoryX Cycle 1 DTOs consumed by
 * User Story 1. Money and quantities arrive as JSON numbers from the provider; the
 * frontend trust boundary converts them to canonical decimal strings.
 */

export const TENANT_ID = "22222222-2222-4222-8222-222222222222";
export const LOCATION_ID = "33333333-3333-4333-8333-333333333333";
export const PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
export const CATEGORY_ID = "77777777-7777-4777-8777-777777777777";
export const CHILD_CATEGORY_ID = "78777777-7777-4777-8777-777777777777";
export const REGISTER_ID = "88888888-8888-4888-8888-888888888888";
export const SHIFT_ID = "99999999-9999-4999-8999-999999999999";
export const SALE_ID = "a9999999-9999-4999-8999-999999999999";
export const CLIENT_SALE_ID = "b9999999-9999-4999-8999-999999999999";
export const IMPORT_JOB_ID = "c9999999-9999-4999-8999-999999999999";

export const registerTenantResult = {
  tenantId: TENANT_ID,
  businessName: "Kwame Provisions",
  subscriptionStatus: "Trialing",
  accessToken: "provider-access-token",
  accessTokenExpiresAt: "2026-08-13T12:00:00.000Z",
  refreshToken: "provider-refresh-token",
} as const;

export const loginResult = {
  requiresTwoFactor: false,
  accessToken: "provider-access-token",
  accessTokenExpiresAt: "2026-08-13T12:00:00.000Z",
  refreshToken: "provider-refresh-token",
} as const;

export const twoFactorRequiredProblem = {
  type: "two_factor_required",
  title: "Two-factor authentication required",
  status: 423,
  detail: "Complete login with a TOTP code.",
  traceId: "00-1111111111111111111111111111aaaa-2222222222223333-01",
} as const;

export const tenantProfile = {
  id: TENANT_ID,
  name: "Kwame Provisions",
  country: "GH",
  currency: "GHS",
  businessType: "Retail",
  valuationMethod: "WeightedAverage",
  onboardingChecklist: JSON.stringify({ location: true, product: false }),
  sampleDataLoaded: false,
  adjustmentApprovalThreshold: 250,
  poApprovalThreshold: 5000,
  tillVarianceThreshold: 20,
  returnAuthorizationThreshold: 100,
  requireExpiryOnBatchReceipt: true,
  billingEmail: "owner@kwame.gh",
  address: "12 Oxford Street, Accra",
  phone: "+233201234567",
} as const;

export const locationRecord = {
  id: LOCATION_ID,
  name: "Main Shop",
  address: "12 Oxford Street, Accra",
  kind: "Shop",
  isActive: true,
} as const;

export const categoryTree = [
  {
    id: CATEGORY_ID,
    name: "Groceries",
    parentId: null,
    children: [
      { id: CHILD_CATEGORY_ID, name: "Dry goods", parentId: CATEGORY_ID, children: [] },
    ],
  },
] as const;

export const taxTreatments = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    code: "GH-STD",
    name: "Ghana standard",
    countryCode: "GH",
    componentsJson: '[{"name":"VAT","rate":0.15}]',
  },
] as const;

export const productRecord = {
  id: PRODUCT_ID,
  name: "Sugar 1kg",
  description: null,
  sku: "SUG-001",
  barcode: "6001234567890",
  categoryId: CATEGORY_ID,
  unitOfMeasure: "Each",
  allowFractional: false,
  sellingPrice: 10,
  costPrice: 6,
  taxTreatmentCode: "GH-STD",
  trackingMode: "Simple",
  status: "Active",
  reorderPoint: 5,
  reorderQuantity: 20,
  leadTimeDays: 3,
  variantAttributes: [],
  variants: [],
} as const;

export const pagedProducts = {
  items: [productRecord],
  page: 1,
  pageSize: 50,
  totalCount: 1,
};

export const stockLevel = {
  productId: PRODUCT_ID,
  productName: "Sugar 1kg",
  variantId: null,
  locationId: LOCATION_ID,
  batchId: null,
  qtyOnHand: 10,
  qtyInTransit: 0,
  qtyQuarantine: 0,
  avgUnitCost: 6,
} as const;

export const stockLevelAfterSale = { ...stockLevel, qtyOnHand: 8 };

export const adjustmentResult = {
  status: "Applied",
  movementProductIds: [PRODUCT_ID],
  adjustmentId: null,
} as const;

export const registerRecord = {
  id: REGISTER_ID,
  locationId: LOCATION_ID,
  name: "Counter 1",
  isActive: true,
} as const;

export const shiftRecord = {
  id: SHIFT_ID,
  registerId: REGISTER_ID,
  openedBy: "owner@kwame.gh",
  openedAt: "2026-08-13T08:00:00.000Z",
  openingFloat: 100,
  status: "Open",
} as const;

export const completedSale = {
  id: SALE_ID,
  clientSaleId: CLIENT_SALE_ID,
  locationId: LOCATION_ID,
  registerId: REGISTER_ID,
  shiftId: SHIFT_ID,
  cashierId: "owner@kwame.gh",
  status: "Completed",
  subtotal: 20,
  discountTotal: 0,
  taxTotal: 3,
  grandTotal: 23,
  changeDue: 2,
  stockConflictFlag: false,
  occurredAt: "2026-08-13T09:15:00.000Z",
  lines: [
    {
      id: "d9999999-9999-4999-8999-999999999999",
      productId: PRODUCT_ID,
      variantId: null,
      batchId: null,
      productName: "Sugar 1kg",
      qty: 2,
      unitPrice: 10,
      lineDiscount: 0,
      taxAmount: 3,
      lineTotal: 23,
      taxComponents: '[{"name":"VAT","amount":3}]',
      note: null,
    },
  ],
  payments: [{ tender: "Cash", amount: 25, reference: null }],
};

export const receiptRecord = {
  id: "e9999999-9999-4999-8999-999999999999",
  saleId: SALE_ID,
  number: "RCP-000001",
  payloadJson: JSON.stringify({ grandTotal: "23.00", lines: 1 }),
  createdAt: "2026-08-13T09:15:02.000Z",
} as const;

export const receiptTemplate = {
  templateJson: JSON.stringify({
    logoUrl: "https://cdn.kwame.gh/logo.png",
    businessName: "Kwame Provisions",
    taxIdentifier: "GHA-123456789",
    footer: "Thank you for shopping with us",
    returnPolicy: "Returns accepted within 7 days with a receipt.",
  }),
} as const;

export const importJobUploaded = {
  id: IMPORT_JOB_ID,
  kind: "Products",
  fileName: "products.csv",
  status: "Uploaded",
  detectedColumns: ["Name", "SKU", "Price"],
  preview: null,
  createdCount: 0,
  updatedCount: 0,
  skippedCount: 0,
};

export const importJobPreviewed = {
  ...importJobUploaded,
  status: "Mapped",
  preview: [
    { rowNumber: 1, isValid: true, errors: [], values: { Name: "Sugar 1kg" } },
    {
      rowNumber: 2,
      isValid: false,
      errors: ["SellingPrice must be a decimal value."],
      values: { Name: "Rice 5kg" },
    },
  ],
};

export const importJobCommitted = {
  ...importJobPreviewed,
  status: "Committed",
  createdCount: 1,
  updatedCount: 0,
  skippedCount: 1,
};

export const validationProblem = {
  type: "https://inventoryx.dev/problems/validation",
  title: "Validation failed",
  status: 400,
  detail: "One or more fields are invalid.",
  traceId: "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01",
  errors: { sku: ["SKU must be unique within the tenant."] },
} as const;
