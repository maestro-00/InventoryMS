import { describe, expect, it } from "vitest";
import {
  formatCreatedAt,
  formatOccurredAt,
  isUtcInstant,
  toUtcInstant,
} from "./date-time";

describe("date-time", () => {
  it("accepts UTC instants with an explicit Z or offset", () => {
    expect(isUtcInstant("2026-08-13T12:00:00.000Z")).toBe(true);
    expect(isUtcInstant("2026-08-13T12:00:00+00:00")).toBe(true);
    expect(isUtcInstant("2026-08-13T12:00:00")).toBe(false);
    expect(isUtcInstant("2026-08-13")).toBe(false);
  });

  it("never substitutes OccurredAt business time for CreatedAt processing time", () => {
    const occurredAt = "2026-08-12T21:15:00.000Z";
    const createdAt = "2026-08-13T00:02:11.000Z";
    expect(formatOccurredAt(occurredAt)).not.toBe(formatCreatedAt(createdAt));
    expect(toUtcInstant(occurredAt)).toBe(occurredAt);
    expect(toUtcInstant(createdAt)).toBe(createdAt);
    expect(() => toUtcInstant("2026-08-13T12:00:00")).toThrow(/UTC instants/);
  });
});
