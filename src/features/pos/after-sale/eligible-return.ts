import Decimal from "decimal.js";
import { apiQuantitySchema } from "../../../shared/api/client/boundary-schema";

export function eligibleReturnQty(line: {
  qty: string | number;
  qtyReturned?: string | number;
}): string {
  const remaining = new Decimal(apiQuantitySchema.parse(line.qty)).minus(
    apiQuantitySchema.parse(line.qtyReturned ?? "0"),
  );
  return remaining.isInteger() ? remaining.toFixed(0) : remaining.toFixed(3);
}
