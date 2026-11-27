import Decimal from "decimal.js";
import {
  fetchStock,
  type StockQuery,
} from "../../inventory/opening-stock/api/opening-stock-api";
import type { CartLine } from "../cart/cart-store";

type StockPage = {
  items: Array<{
    productId: string;
    variantId?: string | null | undefined;
    qtyOnHand: string;
  }>;
  page: number;
  pageSize: number;
  totalCount: number;
};

export type StockIssue = { productId: string; message: string };

export class StockValidationError extends Error {
  constructor() {
    super("The requested quantity exceeds available stock.");
  }
}

/** Read every stock row for each cart product before an online sale. */
export async function checkSaleStock(
  lines: CartLine[],
  locationId: string,
  load: (query: StockQuery) => Promise<StockPage> = fetchStock,
): Promise<StockIssue[]> {
  if (!locationId) throw new Error("Select a location before taking payment.");
  return (
    await Promise.all(
      lines.map(async (line): Promise<StockIssue | null> => {
        let requested: Decimal;
        try {
          requested = new Decimal(line.qty);
        } catch {
          return null; // The cart's quantity validation handles this field.
        }
        if (!requested.isFinite() || requested.lte(0)) return null;
        let page = 1;
        let available = new Decimal(0);
        let result: StockPage;
        do {
          result = await load({
            locationId,
            productId: line.productId,
            page,
            pageSize: 200,
          });
          for (const row of result.items) {
            // POS lines currently have no variant selector; the server debits the base variant.
            if (row.productId === line.productId && row.variantId == null) {
              available = available.plus(row.qtyOnHand);
            }
          }
          page += 1;
        } while ((page - 1) * result.pageSize < result.totalCount);
        if (requested.lte(available)) return null;
        const shortage = requested.minus(available);
        return {
          productId: line.productId,
          message: `${line.productName}: ${available.toString()} available, ${requested.toString()} requested. Reduce the quantity by ${shortage.toString()} or add stock.`,
        };
      }),
    )
  ).filter((issue): issue is StockIssue => issue !== null);
}
