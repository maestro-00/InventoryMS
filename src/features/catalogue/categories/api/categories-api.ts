import { z } from "zod";
import {
  ifMatchHeaders,
  inventoryxClient,
} from "../../../../shared/api/client/inventoryx-client";
import { expectSuccess, parseValue } from "../../../../shared/api/client/api-result";
import { uuidSchema } from "../../../../shared/api/client/boundary-schema";

export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string | null | undefined;
  children: CategoryNode[];
}

const categorySchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({
    id: uuidSchema,
    name: z.string(),
    parentId: uuidSchema.nullish(),
    children: z.array(categorySchema).default([]),
  }),
);

export const categoryInputSchema = z.object({
  name: z.string().min(2, "Enter a category name"),
  parentId: z.string().nullable().optional(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export async function fetchCategories(): Promise<CategoryNode[]> {
  const outcome = await inventoryxClient.GET("/api/v1/categories");
  return parseValue(outcome, z.array(categorySchema), "Categories");
}

function toCategoryBody(input: CategoryInput) {
  const parsed = categoryInputSchema.parse(input);
  return {
    name: parsed.name,
    parentId: parsed.parentId ?? null,
  };
}

export async function createCategory(input: CategoryInput): Promise<CategoryNode> {
  const outcome = await inventoryxClient.POST("/api/v1/categories", {
    body: toCategoryBody(input),
  });
  return parseValue(outcome, categorySchema, "Category");
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
  etag?: string,
): Promise<CategoryNode> {
  const outcome = await inventoryxClient.PATCH("/api/v1/categories/{id}", {
    params: { path: { id } },
    body: toCategoryBody(input),
    headers: ifMatchHeaders(etag),
  });
  return parseValue(outcome, categorySchema, "Category");
}

/** InventoryX retires a category through a recoverable soft delete. */
export async function deactivateCategory(id: string, etag?: string): Promise<void> {
  const outcome = await inventoryxClient.DELETE("/api/v1/categories/{id}", {
    params: { path: { id } },
    headers: ifMatchHeaders(etag),
  });
  expectSuccess(outcome);
}
