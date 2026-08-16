import Decimal from "decimal.js";
import {
  openRegisterDatabase,
  type OfflineSaleRecord,
  type OfflineSaleStatus,
  type ProvisionalReceipt,
  type StockOverlay,
} from "../../shared/db/register-database";
import { isPastDeadline } from "../../shared/auth/register-authorization";

export interface OfflineCartLine {
  productId: string;
  variantId?: string | null;
  batchId?: string | null;
  qty: string;
  unitPrice: string;
  lineDiscount?: string;
  taxComponentsJson: string;
  taxAmount: string;
  lineTotal: string;
  name: string;
}

export interface OfflineCart {
  lines: OfflineCartLine[];
  payments: Array<{ tender: string; amount: string; reference?: string }>;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function effectiveStockQuantity(
  serverQty: string,
  overlays: Array<{ qtyDelta: string; active: boolean }>,
): string {
  let qty = new Decimal(serverQty);
  for (const overlay of overlays) {
    if (!overlay.active) continue;
    qty = qty.plus(overlay.qtyDelta);
  }
  return qty.toFixed(4);
}

export async function completeOfflineSale(input: {
  tenantId: string;
  registerId: string;
  shiftId: string;
  cart: OfflineCart;
  occurredAt?: string;
}): Promise<{ clientSaleId: string; receipt: ProvisionalReceipt }> {
  const db = openRegisterDatabase(input.tenantId, input.registerId);
  try {
    const meta = await db.meta.get(`${input.tenantId}:${input.registerId}`);
    if (!meta || meta.locked) {
      throw new Error("Register partition is locked.");
    }
    if (isPastDeadline(meta.readinessDeadline)) {
      throw new Error("Offline readiness deadline has passed.");
    }
    if (input.cart.lines.length === 0) {
      throw new Error("Cart is empty.");
    }

    const clientSaleId = crypto.randomUUID();
    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const payload = {
      clientSaleId,
      registerId: input.registerId,
      shiftId: input.shiftId,
      occurredAt,
      lines: input.cart.lines,
      payments: input.cart.payments,
      subtotal: input.cart.subtotal,
      discountTotal: input.cart.discountTotal,
      taxTotal: input.cart.taxTotal,
      grandTotal: input.cart.grandTotal,
    };
    const payloadJson = JSON.stringify(payload);
    const payloadHash = await sha256Hex(payloadJson);

    const sale: OfflineSaleRecord = {
      clientSaleId,
      tenantId: input.tenantId,
      registerId: input.registerId,
      shiftId: input.shiftId,
      status: "pending",
      payloadJson,
      payloadHash,
      occurredAt,
      leaseExpiresAt: null,
      serverSaleId: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
    };

    const overlays: StockOverlay[] = input.cart.lines.map((line) => ({
      id: crypto.randomUUID(),
      clientSaleId,
      productId: line.productId,
      variantId: line.variantId ?? null,
      batchId: line.batchId ?? null,
      qtyDelta: new Decimal(line.qty).negated().toFixed(4),
      active: true,
    }));

    const receipt: ProvisionalReceipt = {
      clientSaleId,
      label: "Pending sync",
      payloadJson: JSON.stringify({
        ...payload,
        receiptType: "provisional",
      }),
      qrPayload: JSON.stringify({
        type: "provisional",
        clientSaleId,
        registerId: input.registerId,
        grandTotal: input.cart.grandTotal,
      }),
      createdAt: new Date().toISOString(),
    };

    await db.transaction(
      "rw",
      db.offlineSales,
      db.overlays,
      db.provisionalReceipts,
      async () => {
        await db.offlineSales.add(sale);
        await db.overlays.bulkAdd(overlays);
        await db.provisionalReceipts.add(receipt);
      },
    );

    return { clientSaleId, receipt };
  } finally {
    db.close();
  }
}

export async function listPendingSales(
  tenantId: string,
  registerId: string,
): Promise<OfflineSaleRecord[]> {
  const db = openRegisterDatabase(tenantId, registerId);
  try {
    return await db.offlineSales
      .where("status")
      .anyOf(["pending", "syncing"])
      .toArray();
  } finally {
    db.close();
  }
}

export async function updateSaleStatus(
  tenantId: string,
  registerId: string,
  clientSaleId: string,
  patch: Partial<
    Pick<
      OfflineSaleRecord,
      "status" | "leaseExpiresAt" | "serverSaleId" | "rejectionReason"
    >
  >,
): Promise<void> {
  const db = openRegisterDatabase(tenantId, registerId);
  try {
    const existing = await db.offlineSales.get(clientSaleId);
    if (!existing) throw new Error("Offline sale not found");
    await db.offlineSales.put({ ...existing, ...patch });
  } finally {
    db.close();
  }
}

export type { OfflineSaleStatus };
