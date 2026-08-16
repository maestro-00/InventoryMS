# Performance gates evidence (T226 / T237)

Recorded: 2026-08-14  
Feature: `001-inventory-pos-frontend`  
Budgets: [`../plan.md`](../plan.md) (p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.10)

## Commands

```bash
pnpm build && pnpm check:bundle && pnpm exec lhci autorun
```

## Results (2026-08-14)

| Gate                                    | Result                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bundle budget                           | **PASS**                                                                                               |
| LHCI LCP ≤2500 ms (mobile, median of 3) | **PASS** — median ~1065–1267 ms after vendor chunking, `#boot-brand`, and `build.modulePreload: false` |
| INP                                     | Warn — audit did not run on static shell                                                               |

`lighthouserc.cjs` uses median aggregation for LCP. Reports under `.lighthouseci/`.
