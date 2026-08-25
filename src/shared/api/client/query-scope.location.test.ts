import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { clearLocationCaches } from "./query-scope";

describe("clearLocationCaches", () => {
  it("removes queries that include the location id", async () => {
    const client = new QueryClient();
    const locationId = "33333333-3333-4333-8333-333333333333";
    client.setQueryData(["stock", locationId], { onHand: "1" });
    client.setQueryData(["registers", locationId], []);
    client.setQueryData(["stock", "other-location"], { onHand: "9" });

    await clearLocationCaches(client, locationId);

    expect(client.getQueryData(["stock", locationId])).toBeUndefined();
    expect(client.getQueryData(["registers", locationId])).toBeUndefined();
    expect(client.getQueryData(["stock", "other-location"])).toEqual({ onHand: "9" });
  });
});
