# Authentication & Access Control

## JWT Authentication
- Token stored in httpOnly cookie `mediwyz_token`
- User type in `mediwyz_userType` (non-httpOnly, for frontend routing)
- User ID in `mediwyz_user_id` (non-httpOnly, for frontend display)
- 7-day expiry, `sameSite: 'lax'`, `secure` in production

## Guards (NestJS)
- **JwtAuthGuard** — GLOBAL, all routes protected by default
- **@Public()** — opt-out decorator for public routes
- **AdminGuard** — restricts to admin/regional-admin
- **RolesGuard + @Roles('DOCTOR', 'NURSE')** — dynamic role check from DB
- **FeatureAccessGuard + @RequireFeature('telehealth')** — checks RoleFeatureConfig

## Ownership Checks
Every data-access endpoint must verify: `auth.sub === userId` or user has admin role.

## Account Verification
- New users get `verified: false`
- Features gated until documents uploaded + verified
- VerificationBanner shows on dashboard when unverified
- Registration: minimal fields (name, email, password, phone, DOB, gender, address)
- Documents uploaded post-login via Settings → Documents tab

## Every User is a Patient
All users (including providers) have patient functionality:
- `/api/users/:id/prescriptions` — works for any user
- `/api/users/:id/medical-records` — works for any user
- `/api/bookings/unified?role=patient` — any user can book providers
