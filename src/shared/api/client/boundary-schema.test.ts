import { describe, expect, it } from "vitest";
import {
  apiEnvelopeSchema,
  broadcastMessageSchema,
  parseBoundary,
  uuidSchema,
  workerMessageSchema,
} from "./boundary-schema";

describe("boundary schemas", () => {
  it("accepts API, worker, and broadcast payloads and rejects invalid UUIDs", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(uuidSchema.parse(id)).toBe(id);
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
    expect(
      parseBoundary(
        apiEnvelopeSchema(uuidSchema),
        { items: [id], page: 1, pageSize: 50, totalCount: 1 },
        "page",
      ).totalCount,
    ).toBe(1);
    expect(workerMessageSchema.parse({ type: "sync" }).type).toBe("sync");
    expect(
      broadcastMessageSchema.parse({
        channel: "inventoryms-sync",
        tenantId: id,
        registerId: id,
        type: "status",
      }).type,
    ).toBe("status");
    expect(() => parseBoundary(uuidSchema, "nope", "id")).toThrow(
      /id failed boundary validation/,
    );
  });
});
