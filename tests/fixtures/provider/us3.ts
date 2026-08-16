import * as us1 from "./us1";

export const LOCATION_B_ID = "34333333-3333-4333-8333-333333333333";
export const MOVEMENT_ID = "11111111-1111-4111-8111-111111111101";
export const CORRECTION_ID = "11111111-1111-4111-8111-111111111102";
export const ADJUSTMENT_ID = "11111111-1111-4111-8111-111111111103";
export const TRANSFER_ID = "11111111-1111-4111-8111-111111111104";
export const TRANSFER_LINE_ID = "11111111-1111-4111-8111-111111111105";
export const COUNT_ID = "11111111-1111-4111-8111-111111111106";
export const COUNT_LINE_ID = "11111111-1111-4111-8111-111111111107";
export const REASON_ID = "11111111-1111-4111-8111-111111111108";

export const locationB = {
  id: LOCATION_B_ID,
  name: "Warehouse B",
  address: "Tema",
  kind: "Warehouse",
  isActive: true,
} as const;

export const stockAtA = {
  productId: us1.PRODUCT_ID,
  productName: "Sugar 1kg",
  variantId: null,
  locationId: us1.LOCATION_ID,
  batchId: null,
  qtyOnHand: 10,
  qtyInTransit: 0,
  qtyQuarantine: 0,
  avgUnitCost: 6,
} as const;

export const stockAtB = {
  ...stockAtA,
  locationId: LOCATION_B_ID,
  qtyOnHand: 0,
  qtyInTransit: 10,
} as const;

export const stockRollup = {
  productId: us1.PRODUCT_ID,
  productName: "Sugar 1kg",
  variantId: null,
  locationId: null,
  batchId: null,
  qtyOnHand: 10,
  qtyInTransit: 10,
  qtyQuarantine: 0,
  avgUnitCost: null,
} as const;

export const stockWithoutProfit = {
  ...stockAtA,
  avgUnitCost: null,
} as const;

export const movementRecord = {
  id: MOVEMENT_ID,
  type: "Adjustment",
  productId: us1.PRODUCT_ID,
  variantId: null,
  batchId: null,
  locationId: us1.LOCATION_ID,
  qtyDelta: 10,
  reasonCode: "Correction",
  note: "Opening",
  userId: "owner@kwame.gh",
  occurredAt: "2026-08-13T08:00:00.000Z",
  correlationId: null,
} as const;

export const correctionMovement = {
  ...movementRecord,
  id: CORRECTION_ID,
  qtyDelta: -2,
  note: "Counted over",
  correlationId: MOVEMENT_ID,
  occurredAt: "2026-08-13T11:00:00.000Z",
} as const;

export const adjustmentReasons = [
  {
    id: REASON_ID,
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
] as const;

export const pendingAdjustment = {
  status: "PendingApproval",
  movementProductIds: [],
  adjustmentId: ADJUSTMENT_ID,
} as const;

export const appliedAdjustment = {
  status: "Applied",
  movementProductIds: [us1.PRODUCT_ID],
  adjustmentId: null,
} as const;

export const transferDraft = {
  id: TRANSFER_ID,
  status: "Draft",
  discrepancyReason: null,
  fromLocationId: us1.LOCATION_ID,
  toLocationId: LOCATION_B_ID,
  lines: [
    {
      id: TRANSFER_LINE_ID,
      productId: us1.PRODUCT_ID,
      productName: "Sugar 1kg",
      qtyDispatched: 10,
      qtyReceived: null,
    },
  ],
} as const;

export const transferDispatched = {
  ...transferDraft,
  status: "Dispatched",
} as const;

export const transferReceived = {
  ...transferDraft,
  status: "ReceivedWithDiscrepancy",
  discrepancyReason: "Two bags damaged in transit",
  lines: [
    {
      ...transferDraft.lines[0],
      qtyReceived: 8,
    },
  ],
} as const;

export const openCount = {
  id: COUNT_ID,
  scope: "Spot",
  status: "Open",
  locationId: us1.LOCATION_ID,
  lines: [
    {
      id: COUNT_LINE_ID,
      productId: us1.PRODUCT_ID,
      expectedQty: 8,
      countedQty: null,
      varianceQty: 0,
      varianceValue: 0,
    },
  ],
} as const;

export const submittedCount = {
  ...openCount,
  status: "Submitted",
  lines: [
    {
      id: COUNT_LINE_ID,
      productId: us1.PRODUCT_ID,
      expectedQty: 8,
      countedQty: 7,
      varianceQty: -1,
      varianceValue: -6,
    },
  ],
} as const;

export const approvedCount = {
  ...submittedCount,
  status: "Approved",
} as const;

export const alerts = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    type: "LowStock",
    title: "Sugar 1kg is below reorder",
    body: "Qty on hand is 2 at Main Shop.",
    channel: "InApp",
    lastRaisedAt: "2026-08-13T10:00:00.000Z",
    resolvedAt: null,
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    type: "Expiry",
    title: "Batch near expiry",
    body: "A batch expires within 7 days.",
    channel: "InApp",
    lastRaisedAt: "2026-08-13T09:00:00.000Z",
    resolvedAt: null,
  },
] as const;

export const reorderSuggestions = {
  items: [
    {
      productId: us1.PRODUCT_ID,
      productName: "Sugar 1kg",
      sku: "SUG-001",
      supplierId: "44444444-4444-4444-8444-444444444401",
      supplierName: "Tema Wholesale",
      currentStock: 2,
      reorderPoint: 5,
      suggestedQty: 20,
      leadTimeDays: 3,
      unitCost: 6,
    },
  ],
} as const;

export const staleEtagProblem = {
  type: "https://httpstatuses.com/409",
  title: "The stock count changed since you loaded it.",
  status: 409,
  detail: "Reload the count before submitting again.",
} as const;

export const sameApproverProblem = {
  type: "https://httpstatuses.com/403",
  title: "A different manager must approve this adjustment.",
  status: 403,
} as const;
