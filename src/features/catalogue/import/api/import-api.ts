import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { expectSuccess, parseValue } from "../../../../shared/api/client/api-result";
import { uuidSchema } from "../../../../shared/api/client/boundary-schema";

export const IMPORT_KINDS = ["Products", "OpeningStock"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

const importRowSchema = z.object({
  rowNumber: z.number().int(),
  isValid: z.boolean(),
  errors: z.array(z.string()).default([]),
  values: z.record(z.string(), z.unknown()).default({}),
});

export type ImportRow = z.infer<typeof importRowSchema>;

const importJobSchema = z.object({
  id: uuidSchema,
  kind: z.string(),
  fileName: z.string(),
  status: z.string(),
  detectedColumns: z.array(z.string()).default([]),
  preview: z.array(importRowSchema).nullish(),
  createdCount: z.number().int(),
  updatedCount: z.number().int(),
  skippedCount: z.number().int(),
});

export type ImportJob = z.infer<typeof importJobSchema>;

function formBody(file: File): FormData {
  const form = new FormData();
  form.append("file", file);
  return form;
}

const multipart = {
  bodySerializer: (body: unknown) => body as FormData,
};

export async function uploadProductImport(file: File): Promise<ImportJob> {
  const outcome = await inventoryxClient.POST("/api/v1/import/products", {
    body: formBody(file) as unknown as { file: string },
    ...multipart,
  });
  return parseValue(outcome, importJobSchema, "Import job");
}

export async function uploadOpeningStockImport(file: File): Promise<ImportJob> {
  const outcome = await inventoryxClient.POST("/api/v1/import/opening-stock", {
    body: formBody(file) as unknown as { file: string },
    ...multipart,
  });
  return parseValue(outcome, importJobSchema, "Import job");
}

export async function setImportMapping(
  jobId: string,
  columnMapping: Record<string, string>,
): Promise<ImportJob> {
  const outcome = await inventoryxClient.PUT(
    "/api/v1/import/products/{jobId}/mapping",
    {
      params: { path: { jobId } },
      body: columnMapping,
    },
  );
  return parseValue(outcome, importJobSchema, "Import preview");
}

export async function commitImport(
  jobId: string,
  locationId?: string,
): Promise<ImportJob> {
  const outcome = await inventoryxClient.POST(
    "/api/v1/import/products/{jobId}/commit",
    {
      params: { path: { jobId } },
      body: locationId ? { locationId } : {},
    },
  );
  return parseValue(outcome, importJobSchema, "Import result");
}

export async function abandonImport(jobId: string): Promise<void> {
  const outcome = await inventoryxClient.DELETE("/api/v1/import/products/{jobId}", {
    params: { path: { jobId } },
  });
  expectSuccess(outcome);
}
