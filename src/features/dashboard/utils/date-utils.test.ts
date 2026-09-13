import { describe, expect, it } from "vitest";
import { aggregateDailySales, buildDateRange, formatWeekday } from "./date-utils";

describe("dashboard date utils", () => {
  it("buildDateRange returns ISO bounds", () => {
    const range = buildDateRange(7);
    expect(range.from).toMatch(/T/);
    expect(range.to).toMatch(/T/);
    expect(new Date(range.to).getTime()).toBeGreaterThanOrEqual(
      new Date(range.from).getTime(),
    );
  });

  it("aggregateDailySales sums totals for matching weekdays", () => {
    const today = new Date();
    const label = formatWeekday(today);
    const points = aggregateDailySales(
      [
        { occurredAt: today.toISOString(), total: "1" },
        { occurredAt: today.toISOString(), total: "2" },
      ],
      1,
    );
    expect(points).toEqual([{ label, value: 3 }]);
  });

  it("aggregateDailySales ignores rows outside the window", () => {
    const sameWeekdayLastWeek = new Date();
    sameWeekdayLastWeek.setDate(sameWeekdayLastWeek.getDate() - 7);
    const points = aggregateDailySales(
      [{ occurredAt: sameWeekdayLastWeek.toISOString(), total: "99" }],
      1,
    );
    expect(points.every((point) => point.value === 0)).toBe(true);
  });
});
