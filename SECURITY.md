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

### Cookie-Based Authentication

This application uses HTTP-only cookies for authentication. Ensure:
- Cookies are set with `Secure` flag in production (HTTPS only)
- `SameSite` attribute is properly configured
- Backend implements CSRF protection

### API Communication

- All API requests should be made over HTTPS in production
- Implement rate limiting on the backend to prevent abuse
- Use proper authentication tokens with expiration

### Client-Side Security

- Sensitive data should never be stored in localStorage
- All user inputs are validated on both client and server side
- XSS protection is enabled through React's default escaping

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported releases
4. Release patches as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.

---

**Last Updated:** 2025-10-09
