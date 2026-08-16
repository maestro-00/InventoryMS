import { describe, expect, it } from "vitest";
import { checklistAfterStep, FIRST_SALE_STEP } from "./completion";

describe("checklistAfterStep", () => {
  it("marks the finished step without dropping the other answers", () => {
    expect(checklistAfterStep({ location: true }, FIRST_SALE_STEP)).toEqual({
      location: true,
      firstSale: true,
    });
  });

  it("returns null when the step is already recorded", () => {
    expect(checklistAfterStep({ firstSale: true }, FIRST_SALE_STEP)).toBeNull();
  });
});
