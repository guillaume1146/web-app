# MediWyz — Local NestJS Testing Guide

This guide walks through testing the full app with the NestJS backend **without deleting the Next.js API routes** — so we can compare behavior and roll back if needed.

## Prerequisites

- Docker Desktop running
- Node.js 20+
- The repo cloned

## 1. Environment setup

Your `.env` at the project root needs these values (add if missing):

```bash
# Keep your existing DATABASE_URL, JWT_SECRET, etc.

# NestJS proxy (enables /api/* → http://localhost:3001)
ENABLE_NESTJS_PROXY=true
API_INTERNAL_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
API_PORT=3001
```

When `ENABLE_NESTJS_PROXY=true`, the Next.js `rewrites()` in `next.config.ts` forwards **all** `/api/*` requests to the NestJS backend. When `false` (or unset), Next.js handles them itself (legacy mode).

## 2. Start the stack

```bash
# One-command setup: DB + Prisma push + seed + NestJS build
./backend/scripts/start-local.sh

# Or step by step:
docker compose up -d db                # PostgreSQL on :5432
npx prisma db push                     # sync schema
npx prisma db seed                     # load demo data (42 seed files)
cd backend && npx nest build           # verify build
```

Then open **three terminals**:

```bash
# Terminal 1 — NestJS backend (port 3001)
cd backend && npm run start:dev

# Terminal 2 — Next.js frontend (port 3000) with proxy enabled
ENABLE_NESTJS_PROXY=true API_INTERNAL_URL=http://localhost:3001 npm run dev

# Terminal 3 — run tests (after both are up)
node backend/test/e2e-new-endpoints.mjs    # Smoke test for new endpoints
node backend/test/e2e-full.mjs             # Full e2e suite
cd backend && npm test                     # Jest unit tests
```

## 3. Test credentials (from seed data)

| Role             | Email                                | Password       |
|------------------|--------------------------------------|----------------|
| Patient          | `emma.johnson@mediwyz.com`           | `Patient123!`  |
| Patient          | `jean.pierre@mediwyz.com`            | `Patient123!`  |
| Doctor           | `dr.sarah@mediwyz.com`               | `Doctor123!`   |
| Nurse            | check seed files for `@mediwyz.com`  | `Nurse123!`    |
| Super Admin      | `hassan.doorgakant@healthways.mu`    | `Admin123!`    |

All seeded users share the domain `@mediwyz.com` except the super admin, which uses the value from `SUPER_ADMIN_EMAIL` in `.env`.

## 4. What to manually test in the browser

Navigate through the UI with each user type logged in and verify:

| User Type       | Critical Flows                                                  |
|-----------------|-----------------------------------------------------------------|
| Patient         | Dashboard, book doctor, book nurse, health tracker, wallet, chat|
| Doctor          | Dashboard, appointments, prescriptions, patients, video call    |
| Nurse           | Dashboard, bookings, patients                                   |
| Admin           | Dashboard, stats, users, validation, CMS content                |
| Corporate Admin | Employees, enrollment, claims                                   |
| Insurance Rep   | Claims, plans, dashboard                                        |

## 5. How to verify NestJS is actually handling requests

With the proxy enabled, check the NestJS terminal (terminal 1). You should see incoming requests logged as Nest handles them. If requests are hitting Next.js routes instead, the proxy isn't active — double-check `ENABLE_NESTJS_PROXY=true` is set in the environment where you started `npm run dev`.

You can also test directly against the NestJS backend, bypassing Next.js:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/stats
```

## 6. Rolling back

If something breaks with NestJS, you can instantly switch back to Next.js API routes:

```bash
# Set in .env:
ENABLE_NESTJS_PROXY=false

# Restart Next.js dev server
```

No code changes needed — the proxy is env-flag controlled.

## 7. When we're confident — cleanup (future step)

**Do NOT run this yet.** After all flows are verified working through the NestJS backend:

1. Delete `app/api/**/*` in the Next.js project
2. Delete `lib/auth/validate.ts` and related Next.js-route helpers
3. Remove the `ENABLE_NESTJS_PROXY` flag from `next.config.ts` and always rewrite
4. Update `package.json` scripts to start both servers together

This will shrink the Next.js bundle and eliminate duplicated logic.
