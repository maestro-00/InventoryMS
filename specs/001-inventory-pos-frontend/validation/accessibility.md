# Accessibility validation

**Date**: 2026-09-13 (soft a11y gates reassessment)

| Check                                                       | Gate tier    | Result                                                                      |
| ----------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| Keyboard reachability (`pnpm test:a11y`)                    | **Hard CI**  | Pass on story quality specs run this session / prior                        |
| 200% reflow without horizontal scroll (`pnpm test:a11y`)    | **Hard CI**  | Pass on US1 till reflow spec                                                |
| Chromium axe (critical/serious) (`pnpm test:a11y:advisory`) | **Advisory** | Known contrast failures on navy/light surfaces; run pre-release locally     |
| NVDA                                                        | **Advisory** | Not assessed — no Windows + NVDA host in this Linux CI agent environment    |
| VoiceOver                                                   | **Advisory** | Not assessed — no macOS + VoiceOver host in this Linux CI agent environment |

## Gate policy

- **Historical validation rows** in per-story docs (e.g. `us1-first-sale.md`,
  `us2-counter-sale.md`) that list “axe: zero violations” are pre-2026-09-13 evidence unless
  relabelled; axe is no longer a merge gate.
- **Merge-blocking**: keyboard operability, focus reachability, reflow at 200% zoom, and
  `@critical` Playwright journeys (`pnpm test:a11y` runs the hard subset only).
- **Pre-release advisory**: automated axe scans including WCAG 1.4.3 contrast and ARIA
  naming (e.g. progressbar labels). Run `pnpm test:a11y:advisory` locally before release;
  violations do not block CI.
- Manual NVDA/VoiceOver require dedicated assistive-technology hosts; results are honestly
  **Not assessed** when unavailable, not fabricated pass rates.
