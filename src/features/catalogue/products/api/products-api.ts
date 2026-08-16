import { z } from "zod";
import {
  ifMatchHeaders,
  inventoryxClient,
} from "../../../../shared/api/client/inventoryx-client";
import { parseResource, parseValue } from "../../../../shared/api/client/api-result";
import {
  apiDecimalSchema,
  apiQuantitySchema,
  clampPageSize,
  toApiNullish,
  toApiNumber,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";
import { decimalStringSchema } from "../../../../shared/money/decimal";

export const TRACKING_MODES = ["Simple", "Variant", "Batch"] as const;
export type TrackingMode = (typeof TRACKING_MODES)[number];

export const productVariantInputSchema = z.object({
  attributeValues: z.record(z.string(), z.string()),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  sellingPrice: decimalStringSchema.optional(),
  costPrice: decimalStringSchema.optional(),
});

export const productInputSchema = z.object({
  name: z.string().min(2, "Enter a product name"),
  description: z.string().optional(),
  sku: z.string().min(1, "Enter a tenant-unique SKU"),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().min(1),
  allowFractional: z.boolean(),
  sellingPrice: decimalStringSchema,
  costPrice: decimalStringSchema,
  taxTreatmentCode: z.string().optional(),
  trackingMode: z.enum(TRACKING_MODES),
  variantAttributes: z.array(z.string()).optional(),
  variants: z.array(productVariantInputSchema).optional(),
  reorderPoint: decimalStringSchema.optional(),
  reorderQuantity: decimalStringSchema.optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

const productVariantSchema = z.object({
  id: uuidSchema,
  attributeValues: z.record(z.string(), z.string()).default({}),
  sku: z.string().nullish(),
  barcode: z.string().nullish(),
  sellingPrice: apiDecimalSchema.nullish(),
  costPrice: apiDecimalSchema.nullish(),
});

export const productSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullish(),
  sku: z.string().nullish(),
  barcode: z.string().nullish(),
  categoryId: uuidSchema.nullish(),
  unitOfMeasure: z.string(),
  allowFractional: z.boolean(),
  sellingPrice: apiDecimalSchema,
  /** Absent for callers without ViewProfit; never reconstructed on the client. */
  costPrice: apiDecimalSchema.nullish(),
  taxTreatmentCode: z.string().nullish(),
  trackingMode: z.string(),
  status: z.string(),
  reorderPoint: apiQuantitySchema.nullish(),
  reorderQuantity: apiQuantitySchema.nullish(),
  leadTimeDays: z.number().int().nullish(),
  variantAttributes: z.array(z.string()).default([]),
  variants: z.array(productVariantSchema).default([]),
});

export type ProductRecord = z.infer<typeof productSchema>;

const pagedProductsSchema = z.object({
  items: z.array(productSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
});

export type PagedProducts = z.infer<typeof pagedProductsSchema>;

const taxTreatmentSchema = z.object({
  id: uuidSchema,
  code: z.string(),
  name: z.string(),
  countryCode: z.string(),
  componentsJson: z.string(),
});

export type TaxTreatment = z.infer<typeof taxTreatmentSchema>;

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}

export async function fetchProducts(query: ProductQuery = {}): Promise<PagedProducts> {
  const params: Record<string, string | number> = {
    page: Math.max(1, Math.trunc(query.page ?? 1)),
    pageSize: clampPageSize(query.pageSize ?? 50),
  };
  if (query.search) params["search"] = query.search;
  if (query.categoryId) params["categoryId"] = query.categoryId;

  const outcome = await inventoryxClient.GET("/api/v1/products", {
    params: { query: params },
  });
  return parseValue(outcome, pagedProductsSchema, "Products");
}

export async function fetchProduct(
  id: string,
): Promise<{ product: ProductRecord; etag: string | undefined }> {
  const outcome = await inventoryxClient.GET("/api/v1/products/{id}", {
    params: { path: { id } },
  });
  const { value, etag } = parseResource(outcome, productSchema, "Product");
  return { product: value, etag };
}

function toCreateProductBody(input: ProductInput) {
  const parsed = productInputSchema.parse(input);
  return {
    name: parsed.name,
    description: toApiNullish(parsed.description),
    sku: parsed.sku,
    barcode: toApiNullish(parsed.barcode),
    categoryId: toApiNullish(parsed.categoryId),
    unitOfMeasure: parsed.unitOfMeasure,
    allowFractional: parsed.allowFractional,
    sellingPrice: toApiNumber(parsed.sellingPrice),
    costPrice: toApiNumber(parsed.costPrice),
    taxTreatmentCode: toApiNullish(parsed.taxTreatmentCode),
    trackingMode: parsed.trackingMode,
    variantAttributes: toApiNullish(parsed.variantAttributes),
    reorderPoint:
      parsed.reorderPoint !== undefined ? toApiNumber(parsed.reorderPoint) : null,
    reorderQuantity:
      parsed.reorderQuantity !== undefined ? toApiNumber(parsed.reorderQuantity) : null,
    leadTimeDays: toApiNullish(parsed.leadTimeDays),
  };
}

function toUpdateProductBody(input: ProductInput) {
  const parsed = productInputSchema.parse(input);
  return {
    name: parsed.name,
    description: toApiNullish(parsed.description),
    sku: parsed.sku,
    barcode: toApiNullish(parsed.barcode),
    categoryId: toApiNullish(parsed.categoryId),
    sellingPrice: toApiNumber(parsed.sellingPrice),
    costPrice: toApiNumber(parsed.costPrice),
    taxTreatmentCode: toApiNullish(parsed.taxTreatmentCode),
    reorderPoint:
      parsed.reorderPoint !== undefined ? toApiNumber(parsed.reorderPoint) : null,
    reorderQuantity:
      parsed.reorderQuantity !== undefined ? toApiNumber(parsed.reorderQuantity) : null,
    leadTimeDays: toApiNullish(parsed.leadTimeDays),
  };
}

export async function createProduct(input: ProductInput): Promise<ProductRecord> {
  const outcome = await inventoryxClient.POST("/api/v1/products", {
    body: toCreateProductBody(input),
  });
  return parseValue(outcome, productSchema, "Product");
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  etag?: string,
): Promise<ProductRecord> {
  const outcome = await inventoryxClient.PATCH("/api/v1/products/{id}", {
    params: { path: { id } },
    body: toUpdateProductBody(input),
    headers: ifMatchHeaders(etag),
  });
  return parseValue(outcome, productSchema, "Product");
}

export async function fetchTaxTreatments(): Promise<TaxTreatment[]> {
  const outcome = await inventoryxClient.GET("/api/v1/tax-treatments");
  return parseValue(outcome, z.array(taxTreatmentSchema), "Tax treatments");
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductRecord> {
  const outcome = await inventoryxClient.GET("/api/v1/products/barcode/{barcode}", {
    params: { path: { barcode } },
  });
  return parseValue(outcome, productSchema, "Product");
}

const availabilitySchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.nullish(),
  productName: z.string(),
  locationId: uuidSchema.nullish(),
  qtyOnHand: apiQuantitySchema,
  qtyAvailable: apiQuantitySchema,
  inStock: z.boolean(),
});

export type ProductAvailability = z.infer<typeof availabilitySchema>;

export async function fetchProductAvailability(
  productId: string,
  query: { variantId?: string; locationId?: string } = {},
): Promise<ProductAvailability> {
  const outcome = await inventoryxClient.GET("/api/v1/products/{id}/availability", {
    params: {
      path: { id: productId },
      query: {
        ...(query.variantId ? { variantId: query.variantId } : {}),
        ...(query.locationId ? { locationId: query.locationId } : {}),
      },
    },
  });
  return parseValue(outcome, availabilitySchema, "Availability");
}
