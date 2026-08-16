import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  apiQuantitySchema,
  clampPageSize,
  toApiNullish,
  toApiNumber,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { quantityStringSchema } from "../../../../shared/money/decimal";

export const transferLineSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  productName: z.string().nullish(),
  qtyDispatched: apiQuantitySchema,
  qtyReceived: apiQuantitySchema.nullish(),
});

export const transferSchema = z.object({
  id: uuidSchema,
  status: z.string(),
  discrepancyReason: z.string().nullish(),
  fromLocationId: uuidSchema.nullish(),
  toLocationId: uuidSchema.nullish(),
  lines: z.array(transferLineSchema).default([]),
});

export type TransferRecord = z.infer<typeof transferSchema>;

const transferResultSchema = z.object({
  id: uuidSchema,
  status: z.string(),
  discrepancyReason: z.string().nullish(),
});

const pagedTransfersSchema = z.object({
  items: z.array(transferSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

/**
 * Live InventoryX only exposes transfer commands (create/dispatch/receive) — no list or
 * detail GET. Keep a session cache so the UI and follow-up commands can still resolve
 * line ids and location context from earlier mutations.
 */
const transferCache = new Map<string, TransferRecord>();

function rememberTransfer(record: TransferRecord): TransferRecord {
  transferCache.set(record.id, record);
  return record;
}

function mergeTransferResult(
  result: z.infer<typeof transferResultSchema>,
  seed?: Partial<TransferRecord>,
): TransferRecord {
  const previous = transferCache.get(result.id);
  return transferSchema.parse({
    id: result.id,
    status: result.status,
    discrepancyReason:
      result.discrepancyReason ??
      seed?.discrepancyReason ??
      previous?.discrepancyReason ??
      null,
    fromLocationId: seed?.fromLocationId ?? previous?.fromLocationId ?? null,
    toLocationId: seed?.toLocationId ?? previous?.toLocationId ?? null,
    lines: seed?.lines ?? previous?.lines ?? [],
  });
}

export const createTransferInputSchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: quantityStringSchema,
        variantId: z.string().optional(),
        batchId: z.string().optional(),
      }),
    )
    .min(1),
});

export type CreateTransferInput = z.input<typeof createTransferInputSchema>;

export async function createTransfer(
  input: CreateTransferInput,
): Promise<TransferRecord> {
  const parsed = createTransferInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/transfers", {
    body: {
      fromLocationId: parsed.fromLocationId,
      toLocationId: parsed.toLocationId,
      lines: parsed.lines.map((line) => ({
        productId: line.productId,
        quantity: toApiNumber(line.quantity),
        variantId: toApiNullish(line.variantId),
        batchId: toApiNullish(line.batchId),
      })),
    },
  });
  const result = parseValue(outcome, transferResultSchema, "Transfer");
  return rememberTransfer(
    mergeTransferResult(result, {
      fromLocationId: parsed.fromLocationId,
      toLocationId: parsed.toLocationId,
      lines: parsed.lines.map((line) => ({
        id: crypto.randomUUID(),
        productId: line.productId,
        qtyDispatched: line.quantity,
        qtyReceived: null,
      })),
    }),
  );
}

export function fetchTransfers(
  query: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<z.infer<typeof pagedTransfersSchema>> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = clampPageSize(query.pageSize ?? 50);
  let items = [...transferCache.values()];
  if (query.status) {
    items = items.filter((transfer) => transfer.status === query.status);
  }
  const totalCount = items.length;
  const start = (page - 1) * pageSize;
  return Promise.resolve(
    pagedTransfersSchema.parse({
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount,
    }),
  );
}

export function fetchTransfer(id: string): Promise<TransferRecord> {
  const cached = transferCache.get(id);
  if (!cached) {
    return Promise.reject(
      new Error(
        "Transfer detail is unavailable: InventoryX does not expose GET /api/v1/transfers/{id}",
      ),
    );
  }
  return Promise.resolve(cached);
}

export async function dispatchTransfer(id: string): Promise<TransferRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/transfers/{id}/dispatch", {
    params: { path: { id } },
  });
  const result = parseValue(outcome, transferResultSchema, "Dispatch transfer");
  return rememberTransfer(mergeTransferResult(result));
}

export const receiveTransferInputSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        quantityReceived: quantityStringSchema,
      }),
    )
    .min(1),
  discrepancyReason: z.string().optional(),
});

export type ReceiveTransferInput = z.input<typeof receiveTransferInputSchema>;

export async function receiveTransfer(
  id: string,
  input: ReceiveTransferInput,
): Promise<TransferRecord> {
  const parsed = receiveTransferInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/transfers/{id}/receive", {
    params: { path: { id } },
    body: {
      lines: parsed.lines.map((line) => ({
        lineId: line.lineId,
        quantityReceived: toApiNumber(line.quantityReceived),
      })),
      discrepancyReason: toApiNullish(parsed.discrepancyReason),
    },
  });
  const result = parseValue(outcome, transferResultSchema, "Receive transfer");
  const previous = transferCache.get(id);
  const receivedByLine = new Map(
    parsed.lines.map((line) => [line.lineId, line.quantityReceived]),
  );
  const lines =
    previous?.lines.map((line) => {
      const qtyReceived = receivedByLine.get(line.id);
      return qtyReceived === undefined ? line : { ...line, qtyReceived };
    }) ?? [];
  return rememberTransfer(mergeTransferResult(result, { lines }));
}
