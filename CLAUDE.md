# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MediWyz — a digital health platform for Mauritius built with Next.js 15 (App Router), TypeScript, PostgreSQL (Prisma ORM), Socket.IO, and WebRTC. Connects patients with doctors, nurses, nannies, pharmacists, lab technicians, and emergency workers via video consultations, appointment booking, and prescription management. Supports 11 user types.

## Common Commands

```bash
# Development (runs custom server.js with Socket.IO + Next.js)
npm run dev

# Build (generates Prisma client, then builds Next.js)
npm run build

# Database
npx prisma db push        # Push schema to DB
npx prisma db seed         # Seed demo data (13 seed files)
npx prisma migrate dev     # Create migration
npx prisma studio          # Visual DB browser

# Docker
docker compose up --build -d
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed

# Linting / Type checking
npx eslint .
npx tsc --noEmit
```

## Architecture

### Directory Structure

```
prisma/
  schema.prisma          → Normalized schema: User + 11 profile tables + 30+ domain tables
  seeds/                 → 31 modular seed files (00-regions through 30-platform-services)
  seed.ts                → Orchestrator: clean + seed in dependency order

lib/
  auth/                  → JWT (signToken/verifyToken), cookies, Zod validation schemas
  db.ts                  → Prisma client singleton (default export)
  data/                  → Domain model TypeScript interfaces (Patient, Doctor, Nurse, Nanny)
  db-utils.ts            → Shared Prisma query helpers

components/
  dashboard/             → Shared layout: DashboardLayout, DashboardSidebar, DashboardHeader,
                           DashboardLoadingState, DashboardErrorState
  settings/              → Shared settings: SettingsLayout + tabs (Security, Notifications,
                           Documents, Subscription)
  shared/                → PaymentMethodForm, DashboardStatCard, StatCard, PageHeader
  video/                 → VideoConsultation (generic, any user type) + VideoCallRoom

hooks/                   → useWebRTC, useSocket, useAuth, useCurrency, useDashboardUser

app/
  api/                   → API routes (auth, patients, doctors, users, video, webrtc)
  [userType]/dashboard/  → Dashboard per user type (layout.tsx + sidebar-config.ts + sub-route pages)
  [userType]/settings/   → Settings per user type (thin config → shared SettingsLayout)
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
  └── RegionalAdminProfile (region, country)
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
/api/video/room           — Video room management
/api/webrtc/session       — WebRTC session CRUD
/api/webrtc/recovery      — Session recovery
```

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
| Super Admin (env) | /admin/ | admin | 1 user (auto-created) |
