# Migration Inventory: Prototype → InventoryX Frontend

**Captured**: 2026-08-12  
**Closed**: 2026-08-13 (T214 / T229)  
**Branch**: `feat/pos`  
**Baseline commit**: `cf6e8c2cb5c7805eff76a7d20316690ee8dd3536`  
**Status**: **CLOSED** — every inventoried legacy path is deleted or justified below.

## Closure summary

| Category                                        | Outcome                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reusable UI primitives                          | Copied into `src/shared/ui/`; prototype `src/components/ui/*` deleted                                  |
| Legacy pages / services / auth                  | Deleted; app boots via `src/main.tsx` → `AppProviders` + TanStack Router                               |
| Supabase / npm lockfile / unused stack packages | Absent from `package.json` / `pnpm-lock.yaml`; `date-fns` and `@sentry/react` removed as unused (T214) |
| Prototype auth flow docs                        | `OAUTH_FLOW.md`, `FORGOT_PASSWORD_FLOW.md`, `TWO_FACTOR_AUTH_FLOW.md` deleted                          |
| Governance / static assets                      | Retained (see Justified retain list)                                                                   |

Automated guard: `tests/legacy-boundary.test.ts`.

## Justified retain (not legacy runtime)

| Path                                                                               | Justification                                         |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/shared/ui/*`, `src/shared/utils/cn.ts`, `src/app/styles.css`                  | Audited replacements for retained primitives/tokens   |
| `index.html`, `public/robots.txt`, `public/_redirects`, `public/_headers`          | Document shell, SEO, SPA fallback, security headers   |
| `public/manifest.webmanifest`, `public/icons/`                                     | PWA assets introduced by foundation tasks             |
| `public/placeholder.svg`                                                           | Harmless static placeholder; no auth/API coupling     |
| `LICENSE.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `AUTHORS.md`, `SECURITY.md` | Project governance                                    |
| `.github/workflows/*`                                                              | Replaced Node 24 / pnpm quality and release workflows |

## Deleted (verified absent)

Prototype directories and files removed on 2026-08-13:

- `src/pages/**`, `src/services/**`, `src/contexts/**`, `src/components/**`, `src/hooks/**`, `src/config/**`, `src/lib/**`
- `src/App.tsx`, `src/index.css`
- `OAUTH_FLOW.md`, `FORGOT_PASSWORD_FLOW.md`, `TWO_FACTOR_AUTH_FLOW.md`
- Earlier: `package-lock.json`, Supabase and incompatible stack packages

## Incompatible behaviors that must not return

- `localStorage` / `sessionStorage` session or `auth_token` persistence
- Hand-written endpoints targeting `/InventoryItems`, `/SaleGroups`, `/RetailStock`, `/auth/*`
- Dual package managers (npm lockfile alongside pnpm)
- Prototype and InventoryX route trees coexisting

## Historical inventory (pre-closure)

The tables that originally listed reusable sources, “do not retain” primitives, and
“delete after replacement” runtime files are superseded by the deletion list above.
They remain in git history on the capture commit if needed for archaeology.
