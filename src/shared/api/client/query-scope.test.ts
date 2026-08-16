import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { authSessionFixture } from "../../../../tests/fixtures/domain";
import {
  clearScopedQueries,
  createQueryScope,
  etagMeta,
  permissionRevisionFor,
  scopedQueryKey,
} from "./query-scope";

describe("query scope", () => {
  it("includes tenant, location, register, and permission revision in keys", () => {
    const key = scopedQueryKey({
      tenantId: authSessionFixture.tenantId,
      locationId: authSessionFixture.locationScope[0],
      registerId: "reg-1",
      permissionRevision: "Owner:ManageStock,Sell",
      resource: "products",
      filters: { page: 1, pageSize: 50 },
    });

    expect(key).toEqual([
      authSessionFixture.tenantId,
      authSessionFixture.locationScope[0],
      "reg-1",
      "Owner:ManageStock,Sell",
      "products",
      { page: 1, pageSize: 50 },
    ]);
  });

  it("builds a stable permission revision from role and permissions, not expiry", () => {
    expect(
      permissionRevisionFor({
        role: "Owner",
        permissions: ["Sell", "ManageStock"],
      }),
    ).toBe("Owner:Sell,ManageStock");
    expect(permissionRevisionFor(null)).toBe("none");
  });

  it("clears tenant/location/register caches on scope transition", async () => {
    const client = new QueryClient();
    const scope = createQueryScope({
      tenantId: authSessionFixture.tenantId,
      locationId: authSessionFixture.locationScope[0],
      registerId: "reg-1",
      permissionRevision: "rev-1",
    });

    client.setQueryData(scopedQueryKey({ ...scope, resource: "stock" }), {
      onHand: "10.000",
    });
    client.setQueryData(
      scopedQueryKey({
        tenantId: "other-tenant",
        locationId: "other-location",
        registerId: "reg-9",
        permissionRevision: "rev-1",
        resource: "stock",
      }),
      { onHand: "99.000" },
    );

    await clearScopedQueries(client, {
      tenantId: authSessionFixture.tenantId,
      locationId: authSessionFixture.locationScope[0],
      registerId: "reg-1",
    });

    expect(
      client.getQueryData(scopedQueryKey({ ...scope, resource: "stock" })),
    ).toBeUndefined();
    expect(
      client.getQueryData(
        scopedQueryKey({
          tenantId: "other-tenant",
          locationId: "other-location",
          registerId: "reg-9",
          permissionRevision: "rev-1",
          resource: "stock",
        }),
      ),
    ).toEqual({ onHand: "99.000" });
  });

  it("omits ETag metadata when the provider did not return one", () => {
    expect(etagMeta('W/"12"')).toEqual({ etag: 'W/"12"' });
    expect(etagMeta(null)).toEqual({});
    expect(etagMeta(undefined)).toEqual({});
  });
});
