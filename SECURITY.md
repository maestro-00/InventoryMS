# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of InventoryMS seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

- **Email:** [your-email@example.com]

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- We will acknowledge receipt of your vulnerability report
- We will confirm the problem and determine affected versions
- We will audit code to find any similar problems
- We will prepare fixes for all supported releases
- We will release patches and publish a security advisory

## Security Best Practices

When using InventoryMS, we recommend:

### For Developers

1. **Environment Variables**: Never commit `.env` files or expose API keys
2. **Dependencies**: Regularly update dependencies to patch known vulnerabilities
3. **Authentication**: Use strong passwords and enable two-factor authentication where possible
4. **HTTPS**: Always use HTTPS in production environments
5. **Input Validation**: Validate and sanitize all user inputs
6. **CORS**: Configure CORS properly to prevent unauthorized access

### For Users

1. **Strong Passwords**: Use passwords with at least 12 characters including uppercase, lowercase, numbers, and special characters
2. **Keep Updated**: Always use the latest version of InventoryMS
3. **Secure Backend**: Ensure your backend API is properly secured and uses HTTPS
4. **Access Control**: Implement proper role-based access control
5. **Regular Backups**: Maintain regular backups of your data

## Known Security Considerations

### Session tokens (memory-only)

Access and refresh tokens live in the in-memory `SessionManager`. They must not be
written to `localStorage` or `sessionStorage`. Tests in `src/shared/auth/` assert this
boundary. Production deployments must use HTTPS so refresh traffic cannot be sniffed.

### Session durability across reloads (provider contract)

Because tokens are memory-only, a reload or restored tab has nothing to resume from. The
client recovers the session from a cookie the browser holds and script cannot read, which
keeps the XSS exposure of persisted tokens off the table. InventoryX sets:

- `inventoryx_refresh` as an `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` cookie
  on `/auth/login`, `/auth/register`, `/auth/refresh`, and the Google callback.
- Readable companion cookie `inventoryx_session=1` with `Path=/` and the same lifetime. It
  carries no secret; it only tells the SPA a silent restore is worth a request, so
  anonymous visitors are not sent through a doomed refresh on every cold load.
- `POST /api/v1/auth/refresh` accepts an empty body when the refresh cookie is present,
  and CORS allows credentials for the SPA origin.
- `POST /api/v1/auth/logout` clears both cookies; the SPA calls this on sign-out and also
  clears the readable marker locally.

All InventoryX fetches use `credentials: "include"` so the browser stores and returns
those cookies across the SPA origin. See `src/shared/auth/session-manager.ts` and
`src/app/auth-navigation.test.tsx`.

### Redirect targets

`?redirect=` is replayed after sign-in and is passed to the provider-hosted Google flow as
`returnUrl`. `internalRedirectTarget` accepts only same-document paths, so a crafted link
cannot bounce a freshly authenticated user to another origin.

### Content-Security-Policy and Trusted Types

Static hosts should deploy the header template in `public/_headers`:

- Strict CSP: `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `script-src 'self'` (no `'unsafe-eval'`, no script `'unsafe-inline'`).
- Trusted Types: `require-trusted-types-for 'script'` with policy names
  `default` and `inventoryms` where the browser supports them.
- Camera: `Permissions-Policy: camera=(self)` so barcode scanning may use the device
  camera on the first-party origin only; microphone/geolocation remain disabled.
- Additional hardening: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, HSTS, COOP/CORP.

Hosts that ignore `_headers` (custom CDN, nginx, Cloudflare Transform Rules) must
mirror the same values. Contract coverage:
`tests/contract/security-headers.test.ts`.

### API communication

- All InventoryX calls use the generated OpenAPI client over HTTPS in production.
- No third-party scripts are loaded on POS surfaces; telemetry is opt-in and scrubbed
  (see `docs/telemetry.md`).

### Client-side security

- Sensitive data must never be stored in `localStorage`.
- Inputs are validated with Zod at feature boundaries; InventoryX remains authoritative
  for money and stock math.
- React escaping plus CSP/Trusted Types mitigate XSS; local Dexie encryption is not a
  substitute for same-origin script integrity.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported releases
4. Release patches as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.

---

**Last Updated:** 2026-08-13
