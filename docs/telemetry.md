# Telemetry privacy and deployment

InventoryMS emits optional, scrubbed operational telemetry only. Financial payloads,
credentials, receipt bodies, and personal identifiers must never leave the device.

## Enablement

Set in the deployment environment (never commit secrets):

```env
VITE_TELEMETRY_ENABLED=true
VITE_SENTRY_DSN=
```

Leave `VITE_TELEMETRY_ENABLED=false` (default in `.env.example`) for local development
unless you are validating the scrubber. An empty `VITE_SENTRY_DSN` disables third-party
shipping; the client currently logs scrubbed events to the console adapter when enabled.

## Allowlist

Only operational fields may pass `scrubTelemetryPayload`:

| Allowed        | Examples                                                                           |
| -------------- | ---------------------------------------------------------------------------------- |
| Trace / route  | `traceId`, `routeId`                                                               |
| Metrics        | Web Vital `name`/`value`, `durationMs`, `usageRatio`, `pendingCount`, sync `state` |
| Error envelope | Truncated `name` / `message` (max 180 chars) after scrub                           |

Denied by key or value pattern (case-insensitive): `token`, `password`, `pin`,
`authorization`, `email`, `receipt`, `sale`, `amount`, `refresh`.

## Deployment guidance

1. Serve the SPA over HTTPS with the headers in `public/_headers` (CSP, Trusted Types,
   `camera=(self)`).
2. Do not inject third-party analytics scripts into POS routes; script-src is `'self'`.
3. Configure any future Sentry/project DSN with PII scrubbing on the vendor side as a
   second line of defense; client scrubbing remains mandatory.
4. Verify with `pnpm vitest run src/shared/telemetry/telemetry-privacy.test.ts` before
   enabling telemetry in production.

## Tests

- `src/shared/telemetry/telemetry.test.ts` — boundary + enablement
- `src/shared/telemetry/telemetry-privacy.test.ts` — allowlist / redaction
