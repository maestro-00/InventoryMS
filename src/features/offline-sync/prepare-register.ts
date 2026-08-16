import { z } from "zod";
import { uuidSchema } from "../../shared/api/client/boundary-schema";
import { inventoryxClient } from "../../shared/api/client/inventoryx-client";
import { earliestDeadline } from "../../shared/auth/register-authorization";
import {
  openRegisterDatabase,
  partitionKey,
  replaceSnapshotAtomically,
  type PartitionMeta,
  type SnapshotProduct,
  type SnapshotStock,
  type SnapshotTax,
} from "../../shared/db/register-database";

const snapshotSchema = z.object({
  watermark: z.string(),
  registerId: uuidSchema,
  locationId: uuidSchema,
  bundleVersion: z.string().min(1),
  products: z.array(
    z.object({
      id: uuidSchema,
      name: z.string(),
      sku: z.string().nullable().optional(),
      barcode: z.string().nullable().optional(),
      sellingPrice: z.union([z.string(), z.number()]),
      taxTreatmentId: uuidSchema.nullable().optional(),
      allowFractional: z.boolean(),
      trackingMode: z.string(),
      allowsDiscount: z.boolean().optional(),
      version: z.string(),
    }),
  ),
  variants: z.array(z.unknown()).optional(),
  taxTreatments: z.array(
    z.object({
      id: uuidSchema,
      code: z.string(),
      name: z.string(),
      componentsJson: z.string(),
      version: z.string(),
    }),
  ),
  stock: z.array(
    z.object({
      productId: uuidSchema,
      variantId: uuidSchema.nullable().optional(),
      batchId: uuidSchema.nullable().optional(),
      qtyOnHand: z.union([z.string(), z.number()]),
      qtyInTransit: z.union([z.string(), z.number()]),
      qtyQuarantine: z.union([z.string(), z.number()]),
      version: z.string(),
    }),
  ),
  favourites: z
    .object({
      registerId: uuidSchema,
      layoutJson: z.string(),
      version: z.string(),
    })
    .nullable()
    .optional(),
  receiptTemplate: z
    .object({
      templateJson: z.string(),
      version: z.string(),
    })
    .nullable()
    .optional(),
  deleted: z
    .array(
      z.object({
        entityType: z.string(),
        id: uuidSchema,
        version: z.string(),
      }),
    )
    .optional(),
});

function asDecimalString(value: string | number): string {
  return typeof value === "number" ? value.toFixed(4) : value;
}

async function loadProviderSnapshot(
  registerId: string,
  fetchSnapshot?: () => Promise<unknown>,
) {
  const raw =
    (await fetchSnapshot?.()) ??
    (await (async () => {
      const { data, response } = await inventoryxClient.GET("/api/v1/sync/snapshot", {
        params: { query: { registerId } },
      });
      if (!response.ok) {
        throw new Error(`Snapshot preparation failed (${String(response.status)})`);
      }
      return data;
    })());

  const snapshot = snapshotSchema.parse(raw);
  const products: SnapshotProduct[] = snapshot.products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku ?? null,
    barcode: product.barcode ?? null,
    sellingPrice: asDecimalString(product.sellingPrice),
    taxTreatmentId: product.taxTreatmentId ?? null,
    allowFractional: product.allowFractional,
    trackingMode: product.trackingMode,
    allowsDiscount: product.allowsDiscount ?? true,
    version: product.version,
  }));
  const stock: SnapshotStock[] = snapshot.stock.map((row) => ({
    id: `${row.productId}:${row.variantId ?? ""}:${row.batchId ?? ""}`,
    productId: row.productId,
    variantId: row.variantId ?? null,
    batchId: row.batchId ?? null,
    qtyOnHand: asDecimalString(row.qtyOnHand),
    qtyInTransit: asDecimalString(row.qtyInTransit),
    qtyQuarantine: asDecimalString(row.qtyQuarantine),
    version: row.version,
  }));
  const taxes: SnapshotTax[] = snapshot.taxTreatments.map((tax) => ({
    id: tax.id,
    code: tax.code,
    name: tax.name,
    componentsJson: tax.componentsJson,
    version: tax.version,
  }));

  return {
    watermark: snapshot.watermark,
    bundleVersion: snapshot.bundleVersion,
    products,
    stock,
    taxes,
  };
}

export async function prepareRegister(input: {
  tenantId: string;
  registerId: string;
  shiftId: string;
  credentialExpiresAt: string;
  authorizedAt?: string;
  fetchSnapshot?: () => Promise<unknown>;
}): Promise<{ deadline: string; productCount: number }> {
  const snapshot = await loadProviderSnapshot(input.registerId, input.fetchSnapshot);

  const authorizedAt = input.authorizedAt ?? new Date().toISOString();
  const deadline = earliestDeadline(input.credentialExpiresAt, null, authorizedAt);
  const meta: PartitionMeta = {
    id: partitionKey(input.tenantId, input.registerId),
    tenantId: input.tenantId,
    registerId: input.registerId,
    shiftId: input.shiftId,
    locked: false,
    readinessDeadline: deadline,
    watermark: snapshot.watermark,
    bundleVersion: snapshot.bundleVersion,
    preparedAt: authorizedAt,
  };

  const db = openRegisterDatabase(input.tenantId, input.registerId);
  try {
    await replaceSnapshotAtomically(db, {
      meta,
      products: snapshot.products,
      stock: snapshot.stock,
      taxes: snapshot.taxes,
    });
  } finally {
    db.close();
  }

  return { deadline, productCount: snapshot.products.length };
}

/**
 * Post-apply merge: refresh catalogue/stock from the provider while preserving the
 * existing readiness deadline, shift binding, and lock state.
 */
export async function mergeProviderSnapshot(input: {
  tenantId: string;
  registerId: string;
  fetchSnapshot?: () => Promise<unknown>;
}): Promise<{ watermark: string; bundleVersion: string; productCount: number }> {
  const snapshot = await loadProviderSnapshot(input.registerId, input.fetchSnapshot);
  const db = openRegisterDatabase(input.tenantId, input.registerId);
  try {
    const existing = await db.meta.get(partitionKey(input.tenantId, input.registerId));
    if (!existing) {
      throw new Error("Cannot merge snapshot: register partition is not prepared.");
    }
    const meta: PartitionMeta = {
      ...existing,
      watermark: snapshot.watermark,
      bundleVersion: snapshot.bundleVersion,
      preparedAt: new Date().toISOString(),
    };
    await replaceSnapshotAtomically(db, {
      meta,
      products: snapshot.products,
      stock: snapshot.stock,
      taxes: snapshot.taxes,
    });
    return {
      watermark: snapshot.watermark,
      bundleVersion: snapshot.bundleVersion,
      productCount: snapshot.products.length,
    };
  } finally {
    db.close();
  }
}
