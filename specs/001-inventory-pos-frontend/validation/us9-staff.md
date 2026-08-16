# US9 Staff validation

**Date**: 2026-08-13  
**Mode**: MSW fixture + Chromium Playwright (`VITE_API_MOCKING=true`)

## Evidence

| Check                                                           | Result | Notes                                       |
| --------------------------------------------------------------- | ------ | ------------------------------------------- |
| Contract (UsersController / Auth 2FA enroll)                    | Pass   | `tests/contract/us9-staff.contract.test.ts` |
| Role/scope query clearing unit                                  | Pass   | `staff-access.test.ts`                      |
| Invite / deactivate 409 / PIN / accept / 2FA / audit components | Pass   | `staff.test.tsx`                            |
| Critical E2E invite → PIN → 2FA → audit                         | Pass   | `us9-staff.spec.ts`                         |
| Responsive axe 320/768/1440                                     | Pass   | `us9-staff-quality.spec.ts`                 |
| Keyboard invite + PIN                                           | Pass   |                                             |
| Sensitive deactivate confirmation                               | Pass   | dismiss keeps user                          |

## Honest gaps

- Live InventoryX not run.
- Firefox / WebKit / NVDA / VoiceOver / devices: **not assessed**.
- Usability percentages: **not fabricated**.
