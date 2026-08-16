# Devices validation

**Date**: 2026-08-14 (T240 reassessment)

| Check                         | Result                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Android camera grant/deny     | Not assessed — no physical Android device attached                                          |
| iOS camera grant/deny         | Not assessed — no physical iOS device attached                                              |
| Hardware scanner Enter suffix | Not assessed — no USB/HID scanner attached (desktop wedge covered in unit/E2E buffer tests) |
| Receipt printing              | Not assessed — no physical printer; `window.print` path exists in receipt UI                |
| PWA install/update            | Not assessed on device; SW update deferral covered by unit/E2E fixtures                     |
| Outage recovery on device     | Not assessed on device; offline queue durability covered by US4 browser/provider specs      |

## Assessment attempt notes (T240)

This Linux agent cannot exercise physical Android/iOS, camera permission sheets, hardware
scanners, or receipt printers. Evidence of the assessment attempt is recorded here without
claiming device PASS.
