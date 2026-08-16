import * as us1 from "./us1";

export const RICE_ID = "45444444-4444-4444-8444-444444444444";
export const OIL_ID = "46444444-4444-4444-8444-444444444444";
export const HELD_SALE_ID = "c8888888-8888-4888-8888-888888888888";
export const RETURN_ID = "f1111111-1111-4111-8111-111111111111";
export const EXCHANGE_ID = "f2222222-2222-4222-8222-222222222222";
export const SALE_LINE_ID =
  us1.completedSale.lines[0]?.id ?? "d9999999-9999-4999-8999-999999999999";

export const riceRecord = {
  id: RICE_ID,
  name: "Rice 5kg",
  description: null,
  sku: "RIC-005",
  barcode: "6001234567891",
  categoryId: us1.CATEGORY_ID,
  unitOfMeasure: "Each",
  allowFractional: false,
  sellingPrice: 45,
  costPrice: 30,
  taxTreatmentCode: "GH-STD",
  trackingMode: "Simple",
  status: "Active",
  reorderPoint: 4,
  reorderQuantity: 10,
  leadTimeDays: 3,
  variantAttributes: [],
  variants: [],
} as const;

export const oilRecord = {
  id: OIL_ID,
  name: "Cooking oil 1L",
  description: null,
  sku: "OIL-001",
  barcode: "6001234567892",
  categoryId: us1.CATEGORY_ID,
  unitOfMeasure: "Each",
  allowFractional: true,
  sellingPrice: 18,
  costPrice: 12,
  taxTreatmentCode: "GH-STD",
  trackingMode: "Simple",
  status: "Active",
  reorderPoint: 6,
  reorderQuantity: 12,
  leadTimeDays: 2,
  variantAttributes: [],
  variants: [],
} as const;

export const inactiveOilRecord = { ...oilRecord, status: "Inactive" };

export const favouritesLayout = {
  registerId: us1.REGISTER_ID,
  layoutJson: JSON.stringify({
    pages: [
      {
        id: "page-1",
        name: "Grocery",
        productIds: [us1.PRODUCT_ID, RICE_ID, OIL_ID],
      },
    ],
  }),
};

export const heldSale = {
  id: HELD_SALE_ID,
  clientSaleId: "b8888888-8888-4888-8888-888888888888",
  locationId: us1.LOCATION_ID,
  registerId: us1.REGISTER_ID,
  shiftId: us1.SHIFT_ID,
  cashierId: "owner@kwame.gh",
  status: "Held",
  subtotal: 10,
  discountTotal: 0,
  taxTotal: 1.5,
  grandTotal: 11.5,
  changeDue: 0,
  stockConflictFlag: false,
  occurredAt: "2026-08-13T09:00:00.000Z",
  lines: [
    {
      id: "d8888888-8888-4888-8888-888888888888",
      productId: us1.PRODUCT_ID,
      variantId: null,
      batchId: null,
      productName: "Sugar 1kg",
      qty: 1,
      unitPrice: 10,
      lineDiscount: 0,
      taxAmount: 1.5,
      lineTotal: 11.5,
      taxComponents: '[{"name":"VAT","amount":1.5}]',
      note: null,
    },
  ],
  payments: [],
};

export const staleHeldSale = {
  ...heldSale,
  lines: [
    {
      ...heldSale.lines[0],
      unitPrice: 8,
      taxAmount: 1.2,
      lineTotal: 9.2,
    },
  ],
  subtotal: 8,
  taxTotal: 1.2,
  grandTotal: 9.2,
};

export const splitCompletedSale = {
  ...us1.completedSale,
  id: "a7777777-7777-4777-8777-777777777777",
  clientSaleId: "b7777777-7777-4777-8777-777777777777",
  subtotal: 73,
  taxTotal: 10.95,
  grandTotal: 83.95,
  changeDue: 1.05,
  lines: [
    us1.completedSale.lines[0],
    {
      id: "d7777777-7777-4777-8777-777777777777",
      productId: RICE_ID,
      variantId: null,
      batchId: null,
      productName: "Rice 5kg",
      qty: 1,
      unitPrice: 45,
      lineDiscount: 0,
      taxAmount: 6.75,
      lineTotal: 51.75,
      taxComponents: '[{"name":"VAT","amount":6.75}]',
      note: null,
    },
    {
      id: "d6666666-6666-4666-8666-666666666666",
      productId: OIL_ID,
      variantId: null,
      batchId: null,
      productName: "Cooking oil 1L",
      qty: 1,
      unitPrice: 18,
      lineDiscount: 0,
      taxAmount: 2.7,
      lineTotal: 20.7,
      taxComponents: '[{"name":"VAT","amount":2.7}]',
      note: null,
    },
  ],
  payments: [
    { tender: "Cash", amount: 50, reference: null },
    { tender: "Card", amount: 35, reference: "AUTH-44" },
  ],
};

export const returnTransaction = {
  id: RETURN_ID,
  originalSaleId: us1.SALE_ID,
  exchangeSaleId: null,
  status: "Completed",
  authorizationRequired: false,
  authorizedBy: null,
  refundTender: "Original",
  refundTotal: 11.5,
  occurredAt: "2026-08-13T10:00:00.000Z",
  reason: "Damaged bag",
  lines: [
    {
      id: "e1111111-1111-4111-8111-111111111111",
      saleLineId: SALE_LINE_ID,
      productId: us1.PRODUCT_ID,
      variantId: null,
      qty: 1,
      originalUnitPrice: 10,
      originalTaxAmount: 1.5,
      lineRefund: 11.5,
      disposition: "ToStock",
    },
  ],
};

export const exchangeTransaction = {
  ...returnTransaction,
  id: EXCHANGE_ID,
  exchangeSaleId: "a6666666-6666-4666-8666-666666666666",
  refundTotal: -8,
  reason: "Customer swapped rice for oil",
};

export const receiptDeliverySuccess = {
  saleId: us1.SALE_ID,
  channel: "Email",
  destination: "customer@kwame.gh",
  success: true,
  message: "Queued",
};

export const receiptDeliveryFailure = {
  saleId: us1.SALE_ID,
  channel: "Sms",
  destination: "+233200000000",
  success: false,
  message: "Carrier rejected the message.",
};

export const availabilityLive = {
  productId: us1.PRODUCT_ID,
  variantId: null,
  productName: "Sugar 1kg",
  locationId: us1.LOCATION_ID,
  qtyOnHand: 10,
  qtyAvailable: 10,
  inStock: true,
};

export const approvalRequiredProblem = {
  type: "https://inventoryx.dev/problems/approval-required",
  title: "Manager authorization required",
  status: 423,
  detail: "Refunds above 100 require manager authorization.",
  traceId: "00-cccccccccccccccccccccccccccccccc-dddddddddddddddd-01",
};

export const unknownBarcodeProblem = {
  type: "https://inventoryx.dev/problems/not-found",
  title: "No product matches this barcode.",
  status: 404,
  detail: "No product matches this barcode.",
  traceId: "00-eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee-ffffffffffffffff-01",
};

export const voidedSale = {
  ...us1.completedSale,
  status: "Voided",
};
