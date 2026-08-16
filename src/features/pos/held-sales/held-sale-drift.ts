import type { ProductRecord } from "../../catalogue/products/api/products-api";
import type { SaleRecord } from "../sales/api/sales-api";

export type DriftKind = "price" | "tax" | "availability" | "active-status";

export interface HeldSaleDrift {
  kind: DriftKind;
  productName: string;
  detail: string;
}

export function detectHeldSaleDrift(input: {
  held: SaleRecord;
  products: Pick<
    ProductRecord,
    "id" | "sellingPrice" | "taxTreatmentCode" | "status" | "name"
  >[];
  stockByProduct: Map<string, string>;
}): HeldSaleDrift[] {
  const byId = new Map(input.products.map((product) => [product.id, product]));
  const drift: HeldSaleDrift[] = [];

  for (const line of input.held.lines) {
    const product = byId.get(line.productId);
    if (!product) {
      drift.push({
        kind: "active-status",
        productName: line.productName,
        detail: "This product is no longer in the catalogue.",
      });
      continue;
    }
    if (product.status !== "Active") {
      drift.push({
        kind: "active-status",
        productName: product.name,
        detail: `Status is now ${product.status}.`,
      });
    }
    if (product.sellingPrice !== line.unitPrice) {
      drift.push({
        kind: "price",
        productName: product.name,
        detail: "The catalogue price has changed since this sale was held.",
      });
    }
    if (
      product.taxTreatmentCode &&
      !line.taxComponents.includes("VAT") &&
      product.taxTreatmentCode !== "GH-STD"
    ) {
      drift.push({
        kind: "tax",
        productName: product.name,
        detail: "The tax treatment has changed since this sale was held.",
      });
    }
    const onHand = input.stockByProduct.get(line.productId);
    if (onHand === "0") {
      drift.push({
        kind: "availability",
        productName: product.name,
        detail: "This product is no longer available at this location.",
      });
    }
  }

  return drift;
}
