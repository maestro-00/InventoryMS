import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  addMoney,
  decimalStringSchema,
  formatGhanaMoney,
  isDecimalString,
  multiplyQuantity,
  quantityStringSchema,
} from "./decimal";

describe("decimal money and quantity", () => {
  it("rejects JavaScript numbers as money transport", () => {
    expect(isDecimalString("2.50")).toBe(true);
    expect(isDecimalString(2.5)).toBe(false);
    expect(decimalStringSchema.safeParse(2.5).success).toBe(false);
    expect(decimalStringSchema.safeParse("2.50").success).toBe(true);
  });

  it("formats Ghana cedis from decimal strings", () => {
    expect(formatGhanaMoney("2.50")).toMatch(/GH₵\s?2\.50|GHS\s?2\.50/);
    expect(formatGhanaMoney("1500.00")).toContain("1,500");
  });

  it("uses Decimal.js so money arithmetic is not IEEE float", () => {
    const total = addMoney("0.10", "0.20");
    expect(total).toBe("0.30");
    expect(Number("0.1") + Number("0.2")).not.toBe(0.3);
    expect(new Decimal(total).equals("0.30")).toBe(true);
  });

  it("limits quantities to three decimal places", () => {
    expect(quantityStringSchema.safeParse("1.125").success).toBe(true);
    expect(quantityStringSchema.safeParse("1.1254").success).toBe(false);
    expect(multiplyQuantity("1.500", "2")).toBe("3.000");
  });
});
