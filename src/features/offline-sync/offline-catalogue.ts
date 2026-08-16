import MiniSearch from "minisearch";
import Decimal from "decimal.js";
import {
  openRegisterDatabase,
  type SnapshotProduct,
} from "../../shared/db/register-database";
import { effectiveStockQuantity } from "./offline-sale-repository";

export interface OfflineCatalogueItem {
  product: SnapshotProduct;
  effectiveQty: string;
}

export async function buildOfflineCatalogue(
  tenantId: string,
  registerId: string,
): Promise<{
  byBarcode: Map<string, OfflineCatalogueItem>;
  search: MiniSearch<SnapshotProduct>;
  items: OfflineCatalogueItem[];
}> {
  const db = openRegisterDatabase(tenantId, registerId);
  try {
    const [products, stock, overlays] = await Promise.all([
      db.products.toArray(),
      db.stock.toArray(),
      db.overlays.toArray().then((rows) => rows.filter((row) => row.active)),
    ]);

    const items: OfflineCatalogueItem[] = products.map((product) => {
      const rows = stock.filter((row) => row.productId === product.id);
      const serverQty = rows
        .reduce((sum, row) => sum.plus(row.qtyOnHand), new Decimal(0))
        .toFixed(4);
      const productOverlays = overlays.filter(
        (overlay) => overlay.productId === product.id,
      );
      return {
        product,
        effectiveQty: effectiveStockQuantity(serverQty, productOverlays),
      };
    });

    const byBarcode = new Map<string, OfflineCatalogueItem>();
    for (const item of items) {
      if (item.product.barcode) byBarcode.set(item.product.barcode, item);
    }

    const search = new MiniSearch<SnapshotProduct>({
      fields: ["name", "sku", "barcode"],
      storeFields: ["id", "name", "sku", "barcode", "sellingPrice"],
      idField: "id",
    });
    search.addAll(products);

    return { byBarcode, search, items };
  } finally {
    db.close();
  }
}
