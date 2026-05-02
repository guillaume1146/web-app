# Dynamic Role System — HARD RULE

## Core Principle
Provider roles are DYNAMIC — created by Regional Admins via CRUD on `ProviderRole`. **No hardcoded role codes anywhere in business logic, UI, or data schemas.**

CORPORATE_ADMIN, INSURANCE_REP, and REFERRAL_PARTNER are CAPABILITIES, not roles:
- Any user owning a `CorporateAdminProfile` has corporate-admin capability
- Flagging it `isInsuranceCompany: true` gives them insurance-owner capability
- Every authenticated user is automatically a referral partner (auto-provisioned `ReferralPartnerProfile` with a unique code)

PATIENT has been renamed to MEMBER — the platform does not identify users by illness. "Patient" stays only as a clinical term inside provider-facing screens (chart, prescription, medical record).

## System vs dynamic user types

Only **two** user types are system-defined (stable enums in code):
- `MEMBER` — default for any signup not claiming a provider role
- `REGIONAL_ADMIN` — the role that manages other roles (chicken/egg)

Everything else (DOCTOR, NURSE, NANNY, LAB_TECHNICIAN, EMERGENCY_WORKER, CAREGIVER, PHYSIOTHERAPIST, DENTIST, OPTOMETRIST, NUTRITIONIST, AUDIOLOGIST when added…) is a `ProviderRole.code` — **read from the DB at runtime**.

Import `SystemUserType` from `backend/src/shared/user-types.ts` for the two stable values. The legacy `UserType` record keeps the well-known codes for backward compat with seeded users but must NOT be referenced in NEW code — fetch from `/api/roles` or `RolesResolverService`.

## Forbidden patterns

1. **Role-code conditionals** in TypeScript / Dart:
   - ❌ `if (userType === 'DOCTOR')`
   - ❌ `if (providerType === 'NURSE')`
   - ❌ `switch (userType) { case 'DOCTOR': ... }`
   - ❌ `['DOCTOR', 'NURSE', 'NANNY']` literal arrays for provider types
2. **Role-specific fallbacks** that grow with each new role:
   - ❌ `case 'CAREGIVER': return [...]` inside a switch — should be DB-driven
3. **Hidden gating**: using a role code to grant/hide features:
   - ❌ `const canCreatePosts = userType === 'DOCTOR'`
4. **Role name literals in naming** (folder layouts, URL slugs, env keys):
   - ❌ `/api/doctors/:id/schedule` as the primary endpoint — must be alias over `/providers/:id/schedule`
   - ❌ `app/nurses/(dashboard)` — use `app/provider/[slug]/(dashboard)` with dynamic routing

## Required patterns

1. **Fetch roles from `/api/roles`** on first render; drive menus, forms, and permissions from the result.
2. **Role feature schemas live in the DB**:
   - `ProviderRole.profileFields` — form fields for the role's profile editor
   - `ProviderRole.searchEnabled / bookingEnabled / inventoryEnabled / isProvider` — feature toggles
   - `ProviderRole.defaultBookingFee` — pricing default
   - `ProviderRole.requiredContentType` — workflow content rules
   - `ProviderSpecialty.providerType` — specialty options
   - `RoleFeatureConfig` — granular per-role feature gates
3. **Capabilities via service call**, not role check:
   - `GET /api/corporate/capability` → has corporate-admin capability?
   - `GET /api/corporate/insurance-capability` → owns an insurance company?
   - Never `userType === 'CORPORATE_ADMIN'`
4. **DTOs accept canonical + legacy aliases** so the frontend can be refactored later without breaking old pages:
   - `CreateBookingDto` folds `doctorId` / `nurseId` / `nannyId` → `providerUserId` in the controller
   - Keep legacy fields deprecated but alive during migration

## When a new role is added
A regional admin creates a `ProviderRole` row. **Zero code changes required** to:
- See it in the sidebar (via `getSearchItemsFromRoles`)
- Let patients book it (via `/api/bookings`)
- Edit its profile fields (via `profileFields` JSON)
- Show up in WorkflowBuilder target dropdown (fetched from `/api/roles`)
- Appear in admin/regional user-list filters (fetched, not hardcoded)

If you find yourself touching code because "we added a new role," the code was role-hardcoded. Stop, move the config to the DB, reopen the PR.

## Legacy aliases tolerated (for backwards compat, NOT new code)
- `CORPORATE_ADMIN` / `INSURANCE_REP` still accepted in `User.userType` for historical users; capabilities check both the DB row AND the legacy enum.
- `/insurance/(dashboard)` / `/corporate/(dashboard)` folders exist for old logins; new flows live under capability-agnostic paths.
- `/api/doctors/:id/*` etc. exist as thin passthroughs to `/api/providers/:id/*`.

Never add new logic to those legacy paths — write against the generic path instead.

## Generic Endpoints (use these, not role-specific ones)
```
GET  /providers/:id              — profile (any provider type)
GET  /providers/:id/services     — services
GET  /providers/:id/schedule     — availability
GET  /providers/:id/reviews      — reviews
GET  /providers/:id/statistics   — booking stats
GET  /providers/:id/patients     — patient list
POST /bookings                   — create booking (body.providerType)
GET  /bookings/unified           — all bookings (role=patient|provider)
POST /bookings/action            — accept/deny/complete
GET  /roles                      — all roles + profileFields + specialties
GET  /corporate/capability       — corporate capability check
GET  /corporate/insurance-capability — insurance-company-owner check
```

## Frontend
- Signup loads roles from `/api/roles` (not hardcoded constants)
- Role config pages fetch USER_TYPES from `/api/roles`
- Region lists fetch from `/api/regions`
- Service catalogs fetch from `/api/services/catalog?providerType=X`
- Profile form fields come from `ProviderRole.profileFields` — NOT a frontend switch statement

## Review checklist for every PR
Before merging, grep the diff:
- `grep -E "userType\s*===\s*'[A-Z_]+'" files_changed` → zero hits in new code
- `grep -E "providerType\s*===\s*'[A-Z_]+'" files_changed` → zero hits in new code
- `grep -E "\[\s*'DOCTOR'\s*,\s*'NURSE'" files_changed` → zero hits
- `grep -E "case\s+'DOCTOR'" files_changed` → zero hits

If any are present, either:
- Replace with a DB lookup (preferred), OR
- Add a comment `// LEGACY — remove when X migrates` and link a follow-up issue
