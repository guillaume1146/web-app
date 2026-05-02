---
description: Security baseline — auth, secrets, OWASP top 10
---

# Security

## Authentication & Sessions

- JWT in **httpOnly cookie** (`mediwyz_token`). Never store in localStorage.
- 7-day expiry; rotate on every login.
- `Secure` flag in production, `SameSite=lax`.
- Logout MUST clear the cookie server-side (`max-age=0`).

## Authorization

- Every non-`@Public()` endpoint is JWT-protected via global `JwtAuthGuard`.
- Cross-user data access requires ownership check: `auth.sub === resourceOwnerId` OR admin role OR explicit capability (e.g., `userHasCorporateCapability`).
- **Capability > role**: when a feature is purchasable (corporate, premium), gate by capability, not by role. See `feedback_corporate_is_a_capability_not_a_role.md`.

## Input Validation

- **DTO + class-validator** for every `@Body()` and `@Query()`. Never `@Body() body: any`.
- Whitelist enabled globally so unknown fields are stripped.
- File uploads: validate MIME type, max size, and re-encode images server-side before storage.

## Secrets

- Never commit `.env`. Provide `.env.example` with placeholders.
- Rotate JWT_SECRET if leaked — invalidates all sessions, that's the point.
- Third-party API keys (Groq, MCB Juice) live in env, accessed via `ConfigService`.

## OWASP Top 10 — quick checks

| Risk | MediWyz mitigation |
|---|---|
| **A01 Broken Access Control** | Global JwtAuthGuard, ownership checks per endpoint |
| **A02 Cryptographic Failures** | bcrypt for passwords (cost 10), HTTPS in prod, JWT signed |
| **A03 Injection** | Prisma parameterized queries; never raw SQL with user input |
| **A04 Insecure Design** | DTOs validate everything; capability checks; rate limiting |
| **A05 Security Misconfiguration** | CORS env-driven (`CORS_ALLOWED_ORIGINS`), no debug endpoints in prod |
| **A06 Vulnerable Components** | `npm audit` in CI, dependabot; pin major versions |
| **A07 Auth Failures** | Account lockout after 5 failed logins (TODO if not yet); JWT expiry 7d max |
| **A08 Software/Data Integrity** | Lockfile committed; CI verifies `npm ci` reproducible build |
| **A09 Logging Failures** | Structured logging via NestJS Logger; never log passwords/tokens |
| **A10 SSRF** | Validate user-provided URLs before fetching server-side |

## Forbidden in code

- ❌ `eval()`, `new Function(string)`
- ❌ `dangerouslySetInnerHTML` with user content
- ❌ Logging tokens, passwords, full request bodies
- ❌ `console.log(user.password)` even in dev
- ❌ Skipping rate limiting on auth endpoints
