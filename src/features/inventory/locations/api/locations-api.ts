import { z } from "zod";
import {
  ifMatchHeaders,
  inventoryxClient,
} from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import {
  toApiNullish,
  uuidSchema,
} from "../../../../shared/api/client/boundary-schema";

export const LOCATION_KINDS = ["Shop", "Warehouse", "Storeroom"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export const locationInputSchema = z.object({
  name: z.string().min(2, "Enter a location name"),
  address: z.string().optional(),
  kind: z.enum(LOCATION_KINDS),
  isActive: z.boolean().optional(),
});

export type LocationInput = z.infer<typeof locationInputSchema>;

const locationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  address: z.string().nullish(),
  kind: z.string(),
  isActive: z.boolean(),
});

export type LocationRecord = z.infer<typeof locationSchema>;

const locationListSchema = z.array(locationSchema);

export async function fetchLocations(): Promise<LocationRecord[]> {
  const outcome = await inventoryxClient.GET("/api/v1/locations");
  return parseValue(outcome, locationListSchema, "Locations");
}

export async function createLocation(input: LocationInput): Promise<LocationRecord> {
  const parsed = locationInputSchema.parse(input);
  const outcome = await inventoryxClient.POST("/api/v1/locations", {
    body: {
      name: parsed.name,
      address: toApiNullish(parsed.address),
      kind: parsed.kind,
    },
  });
  return parseValue(outcome, locationSchema, "Location");
}

export async function updateLocation(
  id: string,
  input: LocationInput,
  etag?: string,
): Promise<LocationRecord> {
  const parsed = locationInputSchema.parse(input);
  const outcome = await inventoryxClient.PATCH("/api/v1/locations/{id}", {
    params: { path: { id } },
    body: {
      name: parsed.name,
      address: toApiNullish(parsed.address),
      kind: parsed.kind,
      isActive: toApiNullish(parsed.isActive),
    },
    headers: ifMatchHeaders(etag),
  });
  return parseValue(outcome, locationSchema, "Location");
}
