# Frontend Interface Contracts

These files define the interfaces the Inventory and POS frontend exposes internally to
routes/features and externally to users, browsers, and InventoryX. They supplement the
authoritative InventoryX Cycle 1 contracts; they do not redefine server behavior.

## Contract Hierarchy

1. [Feature specification](../spec.md) defines required user outcomes.
2. Reviewed InventoryX Cycle 1 markdown contracts define intended backend behavior.
3. The committed InventoryX OpenAPI snapshot defines generated request/response shapes.
4. These frontend contracts define consumption policy, navigation/access, offline
   durability, and visible UI state behavior.

When levels 2 and 3 disagree, the InventoryX readiness gate in
[plan.md](../plan.md) blocks the affected integration. Client code MUST NOT guess.

## Files

- [api-integration.md](./api-integration.md): generated client, auth, concurrency,
  errors, paging, decimals, live-only behavior, and query ownership.
- [navigation-access.md](./navigation-access.md): route surface and permission,
  location, plan, register, and connectivity gates.
- [offline-sync.md](./offline-sync.md): local database/service-worker boundary,
  immutable queue, state transitions, retry, receipts, and reconciliation.
- [ui-state-contract.md](./ui-state-contract.md): standard loading, empty, success,
  validation, denial, stale, approval, offline, and destructive-action behavior.

## Readiness

Online interfaces are ready for task generation subject to OpenAPI snapshot capture.
Offline production integration remains blocked by the InventoryX readiness items in
the plan. Offline local models and tests may proceed against reviewed fixtures, but no
fixture is accepted as proof of provider conformance.
