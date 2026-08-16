import { z } from "zod";
import { inventoryxClient } from "../../../../shared/api/client/inventoryx-client";
import { parseValue } from "../../../../shared/api/client/api-result";
import { uuidSchema } from "../../../../shared/api/client/boundary-schema";

const pageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  productIds: z.array(uuidSchema),
});

export const favouritesLayoutSchema = z.object({
  pages: z.array(pageSchema),
});

export type FavouritesLayout = z.infer<typeof favouritesLayoutSchema>;

const envelopeSchema = z.object({
  registerId: uuidSchema,
  layoutJson: z.string(),
});

function parseLayout(layoutJson: string): FavouritesLayout {
  try {
    const parsed = favouritesLayoutSchema.safeParse(JSON.parse(layoutJson));
    return parsed.success ? parsed.data : { pages: [] };
  } catch {
    return { pages: [] };
  }
}

export async function fetchFavouritesLayout(
  registerId: string,
): Promise<FavouritesLayout> {
  const outcome = await inventoryxClient.GET(
    "/api/v1/registers/{registerId}/favourites",
    {
      params: { path: { registerId } },
    },
  );
  const envelope = parseValue(outcome, envelopeSchema, "Favourites");
  return parseLayout(envelope.layoutJson);
}

export async function saveFavouritesLayout(
  registerId: string,
  layout: FavouritesLayout,
): Promise<FavouritesLayout> {
  const outcome = await inventoryxClient.PUT(
    "/api/v1/registers/{registerId}/favourites",
    {
      params: { path: { registerId } },
      body: { layoutJson: JSON.stringify(favouritesLayoutSchema.parse(layout)) },
    },
  );
  const envelope = parseValue(outcome, envelopeSchema, "Favourites");
  return parseLayout(envelope.layoutJson);
}
