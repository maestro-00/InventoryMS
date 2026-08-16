import Dexie, { type EntityTable, type Table } from "dexie";

export const REGISTER_DB_SCHEMA_VERSION = 1;

export type OfflineSaleStatus =
  "pending" | "syncing" | "applied" | "applied_with_conflict" | "rejected";

export interface PartitionMeta {
  id: string;
  tenantId: string;
  registerId: string;
  shiftId: string | null;
  locked: boolean;
  readinessDeadline: string | null;
  watermark: string | null;
  bundleVersion: string | null;
  preparedAt: string | null;
}

export interface SnapshotProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sellingPrice: string;
  taxTreatmentId: string | null;
  allowFractional: boolean;
  trackingMode: string;
  allowsDiscount: boolean;
  version: string;
}

export interface SnapshotStock {
  id: string;
  productId: string;
  variantId: string | null;
  batchId: string | null;
  qtyOnHand: string;
  qtyInTransit: string;
  qtyQuarantine: string;
  version: string;
}

export interface SnapshotTax {
  id: string;
  code: string;
  name: string;
  componentsJson: string;
  version: string;
}

export interface OfflineSaleRecord {
  clientSaleId: string;
  tenantId: string;
  registerId: string;
  shiftId: string;
  status: OfflineSaleStatus;
  payloadJson: string;
  payloadHash: string;
  occurredAt: string;
  leaseExpiresAt: string | null;
  serverSaleId: string | null;
  rejectionReason: string | null;
  /** Present after an applied / applied_with_conflict result once the final receipt is fetched. */
  finalReceiptId?: string | null;
  finalReceiptNumber?: string | null;
  /** Snapshot watermark merged when the provider result was applied. */
  appliedSnapshotWatermark?: string | null;
  createdAt: string;
}

export interface StockOverlay {
  id: string;
  clientSaleId: string;
  productId: string;
  variantId: string | null;
  batchId: string | null;
  qtyDelta: string;
  active: boolean;
}

export interface ProvisionalReceipt {
  clientSaleId: string;
  label: "Pending sync";
  payloadJson: string;
  qrPayload: string;
  createdAt: string;
}

export type RegisterDatabase = Dexie & {
  meta: EntityTable<PartitionMeta, "id">;
  products: EntityTable<SnapshotProduct, "id">;
  stock: EntityTable<SnapshotStock, "id">;
  taxes: EntityTable<SnapshotTax, "id">;
  offlineSales: EntityTable<OfflineSaleRecord, "clientSaleId">;
  overlays: EntityTable<StockOverlay, "id">;
  provisionalReceipts: EntityTable<ProvisionalReceipt, "clientSaleId">;
};

export function partitionKey(tenantId: string, registerId: string): string {
  return `${tenantId}:${registerId}`;
}

export function openRegisterDatabase(
  tenantId: string,
  registerId: string,
): RegisterDatabase {
  const name = `inventoryms-register-${partitionKey(tenantId, registerId)}`;
  const db = new Dexie(name) as RegisterDatabase;
  db.version(REGISTER_DB_SCHEMA_VERSION).stores({
    meta: "id, tenantId, registerId",
    products: "id, barcode, sku, name",
    stock: "id, productId, variantId, batchId",
    taxes: "id, code",
    offlineSales: "clientSaleId, status, leaseExpiresAt, createdAt",
    overlays: "id, clientSaleId, productId, active",
    provisionalReceipts: "clientSaleId",
  });
  return db;
}

export async function replaceSnapshotAtomically(
  db: RegisterDatabase,
  input: {
    meta: PartitionMeta;
    products: SnapshotProduct[];
    stock: SnapshotStock[];
    taxes: SnapshotTax[];
  },
): Promise<void> {
  await db.transaction("rw", db.meta, db.products, db.stock, db.taxes, async () => {
    await Promise.all([db.products.clear(), db.stock.clear(), db.taxes.clear()]);
    await db.meta.put(input.meta);
    await db.products.bulkPut(input.products);
    await db.stock.bulkPut(input.stock);
    await db.taxes.bulkPut(input.taxes);
  });
}

type OptionalStorageManager = {
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
};

export async function estimateStorage(): Promise<{
  usage: number;
  quota: number;
  persistent: boolean;
}> {
  const storage = navigator.storage as unknown as OptionalStorageManager | undefined;
  const estimate = storage?.estimate ? await storage.estimate() : {};
  const persistent = storage?.persisted ? await storage.persisted() : false;
  return {
    usage: estimate.usage ?? 0,
    quota: estimate.quota ?? Number.POSITIVE_INFINITY,
    persistent,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  const storage = navigator.storage as unknown as OptionalStorageManager | undefined;
  if (!storage?.persist) return false;
  return storage.persist();
}

export type { Table };
