# Security audit validation

**Date**: 2026-08-14

| Check               | Result                          |
| ------------------- | ------------------------------- |
| `pnpm audit --prod` | Pass — no known vulnerabilities |
| Accepted findings   | See approved exception below    |

CSP/Trusted Types deployment templates land in `public/_headers` with contract coverage in
`tests/contract/security-headers.test.ts` (T215). Mirror the same headers on CDNs that
ignore `_headers`.

## Approved exception — FR-079 permission claim fallback (T241)

**Status**: Accepted until InventoryX emits `permissions` on access tokens (or a dedicated
permissions endpoint is contracted).

**Why**: Live InventoryX JWTs observed in this environment include role, tenant, and
location scope but omit the `permissions` array. Treating an empty claim list as
authoritative would lock Owner/Admin out of Sell and other permission-gated routes.

**Mitigation**: `sessionFromTokens` uses JWT `permissions` whenever present; only when
the claim is absent or empty does it mirror InventoryX `RoleSeeder` via
`permissionsForRole`. MSW fixtures that include explicit permissions are unchanged.

**Expiry / owner**: Remove the RoleSeeder fallback once InventoryX documents and ships
permission claims; track against InventoryX readiness, owner = frontend + provider teams.
