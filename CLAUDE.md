# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MediWyz — a digital health platform for Mauritius built with Next.js 15 (App Router), TypeScript, PostgreSQL (Prisma ORM), Socket.IO, and WebRTC. Connects patients with doctors, nurses, nannies, pharmacists, lab technicians, emergency workers, caregivers, physiotherapists, dentists, optometrists, and nutritionists via video consultations, appointment booking, prescription management, and a Health Shop. Supports 17 user types. Features a configurable workflow engine where providers and regional admins can create custom workflows with status-triggered actions (video calls, stock management) and auto-notifications.

## Architecture: NestJS Backend + Next.js Frontend

**NestJS is the ONLY backend.** Next.js is a pure frontend (SSR/SSG) that proxies all `/api/*` requests to NestJS via `next.config.ts` rewrites. `app/api/` has been removed — do NOT recreate route handlers (`route.ts`), Server Actions (`'use server'`), or import `@/lib/db` from any page/component/hook. The only legitimate Prisma consumers outside `backend/` are `prisma/seeds/*` and `prisma/scripts/*` (dev-time tooling, never bundled into the Next.js runtime).

**Core Principle: Dynamic Roles.** Provider roles (Doctor, Nurse, Optician, etc.) are created dynamically by Regional Admins via CRUD on `ProviderRole`. NO hardcoded role names in business logic. Every user is also a patient.

## Common Commands

```bash
# Development — start BOTH servers
cd backend && npm run start:dev   # NestJS on port 3001
npm run dev                        # Next.js on port 3000 (proxies /api/* → NestJS)

# Build
npm run build                      # Next.js frontend build
cd backend && npm run build        # NestJS backend build

# Database
npx prisma db push        # Push schema to DB
npx prisma db seed         # Seed demo data (44 seed files)
npx prisma migrate dev     # Create migration
npx prisma studio          # Visual DB browser

# Docker
docker compose up --build -d       # Starts: db + api (NestJS) + app (Next.js)

# Type checking
cd backend && npx tsc --noEmit     # Backend type check
npx tsc --noEmit                   # Frontend type check

# Testing
npm run test                       # Vitest unit tests
npm run test:migration             # Playwright NestJS migration E2E
npx playwright test                # Full E2E suite (127+ tests)

# API Documentation
# Swagger UI: http://localhost:3001/api/docs
```

## Architecture

### Directory Structure

```
prisma/
  schema.prisma          → Normalized schema: User + 16 profile tables + 40+ domain tables
  seeds/                 → 33 modular seed files (00-regions through 33-service-bookings)
  seed.ts                → Orchestrator: clean + seed in dependency order

lib/
  auth/                  → JWT (signToken/verifyToken), cookies, Zod validation schemas
  db.ts                  → Prisma client singleton (default export)
  data/                  → Domain model TypeScript interfaces (Patient, Doctor, Nurse, Nanny)
  db-utils.ts            → Shared Prisma query helpers
  workflow/              → Workflow engine: engine, registry, strategies, repositories, types
  inventory/             → Provider inventory: types, repository, order-service
  booking/               → Booking cost check, slot validation
  bookings/              → Booking resolution (resolve-booking.ts)
  commission.ts          → Commission calculation (Platform 15% / Provider 85%)
  notifications.ts       → Notification creation + Socket.IO emission

components/
  dashboard/             → Shared layout: DashboardLayout, DashboardSidebar, DashboardHeader,
                           DashboardLoadingState, DashboardErrorState
  settings/              → Shared settings: SettingsLayout + tabs (Security, Notifications,
                           Documents, Subscription)
  shared/                → PaymentMethodForm, DashboardStatCard, StatCard, PageHeader
  video/                 → VideoConsultation (generic, any user type) + VideoCallRoom
  workflow/              → WorkflowTimeline, WorkflowCurrentStep, WorkflowActionButton,
                           WorkflowStepBuilder, NotificationTemplateEditor
  health-shop/           → ShopItemCard, ShopFilters, ShopCart

hooks/                   → useWebRTC, useSocket, useAuth, useCurrency, useDashboardUser

app/
  api/                   → API routes (auth, patients, doctors, users, video, webrtc,
                           workflow, inventory, bookings, search)
  [userType]/(dashboard)/ → Dashboard per user type (layout.tsx + sidebar-config.ts + sub-route pages)
  [userType]/settings/   → Settings per user type (thin config → shared SettingsLayout)
  search/health-shop/    → Health Shop (all providers' inventory, replaces "Buy Medicines")
  login/                 → Login page + auth utilities
  signup/                → Registration page
```

### Database Schema — Base User Model + Profile Tables

Single `User` table handles auth + cross-cutting concerns. Type-specific data in 1:1 profile tables:

```
User (id, firstName, lastName, email, password, userType, phone, verified, accountStatus, ...)
  ├── PatientProfile (bloodType, allergies, chronicConditions, healthScore, ...)
  ├── DoctorProfile (specialty, licenseNumber, consultationFee, rating, bio, ...)
  ├── NurseProfile (licenseNumber, experience, specializations, ...)
  ├── NannyProfile (experience, certifications, ...)
  ├── PharmacistProfile (licenseNumber, pharmacyName, ...)
  ├── LabTechProfile (licenseNumber, labName, specializations, ...)
  ├── EmergencyWorkerProfile (certifications, vehicleType, responseZone, emtLevel, ...)
  ├── InsuranceRepProfile (companyName, coverageTypes, ...)
  ├── CorporateAdminProfile (companyName, employeeCount, ...)
  ├── ReferralPartnerProfile (businessType, commissionRate, referralCode, ...)
  ├── RegionalAdminProfile (region, country)
  └── (Caregiver, Physiotherapist, Dentist, Optometrist, Nutritionist use User fields + ServiceBooking)
```

Clinical relations (Appointment, Prescription, MedicalRecord) reference profile IDs. Cross-cutting relations (VideoCallSession, Conversation, Notification, BillingInfo) reference User IDs.

### Dashboard Routing — URL-Based with Shared Layout

Each user type has:
- `app/[userType]/dashboard/layout.tsx` — wraps children with `DashboardLayout` + data context
- `app/[userType]/dashboard/sidebar-config.ts` — sidebar items with `href` + `getActiveSectionFromPath()`
- `app/[userType]/dashboard/page.tsx` — overview/default page
- Sub-route pages (e.g., `consultations/page.tsx`) — thin wrappers importing domain components

Navigation uses Next.js `<Link>` (URL-based), not `setState`. Active sidebar item derived from `usePathname()`.

### Settings — Config-Driven Shared Components

`components/settings/SettingsLayout.tsx` renders a tabbed UI from a `SettingsTab[]` config:
```typescript
interface SettingsTab { id: string; label: string; icon: IconType; component: React.ReactNode }
```

Each user type's settings page is a thin config file passing type-specific tabs (profile tab is unique per type; security, notifications, documents, subscription are shared).

### Video Calls — Generic for Any User Type

- `VideoConsultation` accepts `currentUser: { id, firstName, lastName, userType, upcomingAppointments }`
- Works for patient↔doctor, patient↔nurse, patient↔nanny, doctor↔nurse, etc.
- Socket.IO signaling with infinite reconnection (`hooks/useSocket.ts`)
- simple-peer P2P WebRTC (`hooks/useWebRTC.ts`)
- Session persistence via `/api/webrtc/session` and `/api/webrtc/recovery`

### Custom Server (`server.js`)

Next.js wrapped by Node.js server co-hosting Socket.IO. Dev runs `node server.js`, NOT `next dev`. Handles WebRTC signaling, room management, heartbeat monitoring.

### Authentication (`lib/auth/`)

- JWT tokens in httpOnly cookies
- `POST /api/auth/login` — validates against `User` table, returns user data
- `POST /api/auth/register` — creates User + profile in a transaction
- `GET /api/auth/me` — returns current user from JWT
- Middleware checks `mediwyz_userType` cookie for route protection

### Subscription & Billing System

```
PlatformService        → Unified service catalog (defaults + custom, per provider type)
ProviderServiceConfig  → Provider's instance of a service with optional priceOverride
ServiceGroup           → Regional admin groups services for plan building
SubscriptionPlan       → Individual/corporate plans with quotas, discounts, features
SubscriptionPlanService→ Links plans to services (free/paid, admin price, monthly limit)
UserSubscription       → User's active plan (corporateAdminId for employer-paid)
SubscriptionUsage      → Monthly usage tracking per consultation type
```

Commission model: Platform 15% / Provider 85% / Regional 0% (earns from subscriptions).

Corporate billing: employer pays for all employees via `enrollEmployeesInPlan()` with volume discounts. Individual users cannot subscribe to corporate plans.

Booking flow: check subscription quota → apply discount off provider market price → charge wallet.

### Workflow Engine (`lib/workflow/`)

Configurable status tracking system for all booking types. See `docs/WORKFLOW-ENGINE-IMPLEMENTATION-PLAN.md` for full spec.

```
WorkflowTemplate       → Defines steps, transitions, notification messages per service+mode
WorkflowInstance       → Tracks one booking's progress through a template
WorkflowStepLog        → Audit trail: every status change recorded with content attachments
NotificationTemplate   → Custom notification messages per step (provider/admin override defaults)
```

Key patterns:
- **Strategy pattern**: Step flags (`triggers_video_call`, `triggers_stock_check`, `triggers_stock_subtract`, `requires_prescription`, `requires_content`) handled by dedicated strategy classes
- **Registry pattern**: Template resolution — provider custom > regional admin > system default
- **Template Method**: Transition engine always runs: validate → pre-flags → update → post-flags → log → notify
- Single transition API: `POST /api/workflow/transition`
- Every status change auto-creates a Notification + Socket.IO event
- Booking model `.status` field stays in sync (backward compatibility)

### Health Shop & Provider Inventory

```
ProviderInventoryItem  → Any provider can sell items (medicines, glasses, equipment, supplies)
InventoryOrder         → Patient orders from any provider's inventory
InventoryOrderItem     → Line items with quantity and pricing
```

- Replaces "Buy Medicines" — now "Health Shop" at `/search/health-shop`
- `PharmacyMedicine` and `MedicineOrder` kept for backward compatibility
- `requiresPrescription` is per-item (vitamin C = no, controlled meds = yes)
- Stock management integrated with workflow via step flags
- All providers can have inventory: pharmacist, optometrist, dentist, nanny, nurse, etc.

### API Routes

```
/api/auth/login           — Login (any user type)
/api/auth/register        — Register (any user type + plan selection + auto-assign services)
/api/auth/me              — Current user from JWT
/api/users/[id]           — Generic user profile
/api/users/[id]/notifications — User notifications (GET, PATCH mark-read)
/api/users/[id]/subscription — GET usage summary, POST subscribe/cancel/change
/api/users/[id]/wallet    — GET balance + transactions
/api/users/[id]/wallet/topup — POST top-up (MCB Juice / card, simulated)
/api/users/[id]/wallet/reset — POST reset trial (infinite, custom amount)
/api/subscriptions        — GET all plans (filter by type, countryCode)
/api/subscriptions/[id]   — GET single plan with linked services
/api/regions/[id]         — GET region with currency data
/api/services/catalog     — GET unified service catalog (grouped by provider type)
/api/services/custom      — POST create custom service (providers)
/api/services/my-services — GET/PATCH provider service configs (price overrides)
/api/regional/subscriptions — GET/POST regional admin plan CRUD
/api/regional/subscriptions/[id] — GET/PATCH/DELETE single plan
/api/regional/service-groups — GET/POST service group management
/api/corporate/enroll     — GET preview / POST enroll employees in plan
/api/patients/[id]/...    — Patient-specific (appointments, prescriptions, health-records, etc.)
/api/doctors/[id]/...     — Doctor-specific (appointments, patients, schedule, notifications)
/api/bookings/doctor|nurse|nanny|lab-test|emergency — Booking with subscription cost check
/api/bookings/service     — POST/GET generic booking (caregiver, physio, dentist, optometrist, nutritionist)
/api/bookings/unified     — GET all bookings across all types with dynamic actions
/api/programs             — GET/POST health programs (vaccination, rehab, mental health)
/api/programs/[id]/enroll — POST patient enrollment in a program
/api/programs/[id]/providers — POST add collaborating provider
/api/roles                — GET all provider roles with specialties (DB-driven)
/api/search/providers     — GET search providers by type (all roles)
/api/video/room           — Video room management
/api/webrtc/session       — WebRTC session CRUD
/api/webrtc/recovery      — Session recovery
/api/workflow/transition  — POST status change (single entry point for all bookings)
/api/workflow/instances   — GET user's workflow instances
/api/workflow/instances/[id] — GET instance with state + timeline
/api/workflow/templates   — GET/POST workflow templates
/api/workflow/templates/[id] — GET/PATCH/DELETE template
/api/workflow/my-templates — GET/POST provider's custom templates
/api/inventory            — GET/POST provider inventory items
/api/inventory/[id]       — PATCH/DELETE inventory item
/api/inventory/orders     — GET/POST inventory orders
/api/inventory/orders/[id] — PATCH order status
/api/search/health-shop   — GET browse all providers' items
/api/regional/workflow-templates — GET/POST regional workflow templates

# ─── Recent additions ──────────────────────────────────────────────────
/api/favorites              — GET saved providers for current user
/api/favorites/:id/toggle   — POST toggle save/unsave
/api/health-streak          — GET current streak + longest
/api/health-streak/check-in — POST idempotent daily check-in
/api/corporate/analytics    — GET owner-view analytics (members + claims + revenue)
/api/corporate/companies/:id/transfer — POST transfer ownership by email
/api/corporate/companies/:id          — DELETE company (members soft-removed)
/api/corporate/insurance-companies    — GET public search of insurance companies
/api/corporate/insurance/:id/join     — POST member joins + first-month debit
/api/corporate/insurance/:id/contribute — POST pay this month's contribution
/api/corporate/insurance/members      — GET owner view of member payment status
/api/corporate/insurance/claims       — GET (?as=owner|member) / POST submit claim
/api/corporate/insurance/claims/:id/approve — POST approve + credit member wallet
/api/corporate/insurance/claims/:id/deny    — POST decline with optional reviewer note
/api/users/:id/prescriptions/:id/pdf  — GET print-ready HTML (browser saves as PDF)
/api/bookings/reschedule              — POST change scheduledDate / scheduledTime
/api/workflow/templates/library       — GET starter templates library
/api/workflow/templates/:id/clone     — POST clone a library template
/api/ai/chat                          — GET list sessions, POST send message
/api/ai/chat/:id                      — GET reopen session, DELETE session
```

## Scheduled jobs

`RemindersService.runReminderSweep()` runs every 30 min via @nestjs/schedule:
- Emits T-24h reminder for bookings whose `scheduledAt` is 23h45–24h15 away
- Emits T-1h reminder for bookings whose `scheduledAt` is 45–75 min away
- Idempotent via `AppointmentReminder(bookingId, reminderType)` unique constraint

## Capabilities (not roles)

Do NOT check `userType === 'CORPORATE_ADMIN'` / `'INSURANCE_REP'` / `'REFERRAL_PARTNER'` in new code:
- **Corporate admin** = `userHasCorporateCapability(userId)` — owns a `CorporateAdminProfile` OR has a corporate/enterprise subscription.
- **Insurance owner** = `userHasInsuranceCapability(userId)` — owns one with `isInsuranceCompany: true`.
- **Referral partner** = every authenticated user. Auto-provisioned `ReferralPartnerProfile` on first `/api/referral-partners/me` hit; earns wallet credit per successful signup via their code.
- **Multi-company**: a single user can own multiple `CorporateAdminProfile` rows (@unique on userId was dropped).
- Legacy enum values (CORPORATE_ADMIN / INSURANCE_REP / REFERRAL_PARTNER) still honoured for seeded users; UI hides them from signup via `/api/roles` filter.

## PATIENT → MEMBER rename

The default user type is **MEMBER**, not PATIENT:
- Every user has clinical capabilities (`PatientProfile` auto-created on first booking). Identifying the default role as "patient" implied illness.
- Industry practice (Oscar, Teladoc, One Medical, Maven Clinic): "members".
- "Patient" remains valid **inside clinical contexts** — provider-facing chart, prescription notes, medical records. Those strings stay.
- Migration was atomic via `ALTER TYPE "UserType" RENAME VALUE`. Cookie `'patient'` + URL prefix `/patient/*` kept for routing stability.

## System vs dynamic user types

Only TWO user types are hardcoded in code (`backend/src/shared/user-types.ts` → `SystemUserType`):
- `MEMBER` (default for any signup)
- `REGIONAL_ADMIN` (the role that manages other roles)

All provider types (DOCTOR, NURSE, CAREGIVER, future AUDIOLOGIST, PSYCHOLOGIST, …) are **DB rows in `ProviderRole`**. Fetch via `/api/roles` or `RolesResolverService`. Never import them from `user-types.ts` in new code — the legacy `UserType` record there is kept only for grace-period compat with existing seeded data.

## Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`).

## Key Patterns

- API routes validate JWT via `validateRequest()` and enforce ownership (`auth.sub === id`)
- Prisma queries use `select` (not `include`) to return only needed columns
- Error boundaries in `app/error.tsx`, `app/patient/error.tsx`, `app/doctor/error.tsx`
- Domain types live in `lib/data/` (Patient, Doctor, Nurse, Nanny interfaces)
- Video call component is shared and generic — never duplicate per user type
- `DashboardStatCard` is the single source of truth for dashboard stat cards
- `PaymentMethodForm` supports MCB Juice + credit/debit card — used by all user types
- Docker Compose provides PostgreSQL + App for local development
- Booking status changes go through `WorkflowEngine.transition()` — not direct DB updates
- Workflow templates linked to PlatformService (resolution: provider > regional admin > system default)
- Step flags compose behavior: `triggers_video_call`, `triggers_stock_check`, `triggers_stock_subtract`
- Health Shop: all providers can sell items via `ProviderInventoryItem`, not just pharmacists
- Seeds: DO NOT remove existing seed files — add new ones with next available number

## User Types & Routes

| UserType | URL Prefix | Cookie Value | Seeded |
|----------|-----------|--------------|--------|
| PATIENT | /patient/ | patient | 5 users |
| DOCTOR | /doctor/ | doctor | 3 users |
| NURSE | /nurse/ | nurse | 2 users |
| NANNY | /nanny/ | child-care-nurse | 2 users |
| PHARMACIST | /pharmacist/ | pharmacy | 2 users |
| LAB_TECHNICIAN | /lab-technician/ | lab | 2 users |
| EMERGENCY_WORKER | /responder/ | ambulance | 2 users |
| INSURANCE_REP | /insurance/ | insurance | 2 users |
| CORPORATE_ADMIN | /corporate/ | corporate | 1 user |
| REFERRAL_PARTNER | /referral-partner/ | referral-partner | 1 user |
| REGIONAL_ADMIN | /regional/ | regional-admin | 7 users (MU×2, MG, KE, TG, BJ, RW) |
| CAREGIVER | /caregiver/ | caregiver | 2 users |
| PHYSIOTHERAPIST | /physiotherapist/ | physiotherapist | 1 user |
| DENTIST | /dentist/ | dentist | 1 user |
| OPTOMETRIST | /optometrist/ | optometrist | 1 user |
| NUTRITIONIST | /nutritionist/ | nutritionist | 1 user |
| Super Admin (env) | /admin/ | admin | 1 user (auto-created) |
