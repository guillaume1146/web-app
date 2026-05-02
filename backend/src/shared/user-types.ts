/**
 * User-type constants — NARROW.
 *
 * Only the **system-defined** roles live here. Everything else (DOCTOR,
 * NURSE, PHARMACIST, AUDIOLOGIST, any role a regional admin creates via
 * `ProviderRole` CRUD) must be resolved at runtime from the database,
 * NOT imported from this file.
 *
 * Rule of thumb:
 *   ✓ reference `SystemUserType.MEMBER` / `SystemUserType.REGIONAL_ADMIN`
 *   ✗ hardcode `'DOCTOR' | 'NURSE' | 'AUDIOLOGIST'` anywhere
 *   ✓ fetch from `GET /api/roles` or use `RolesResolverService`
 *
 * See `.claude/rules/dynamic-roles.md` for the full principle.
 *
 * ─── Why these three are special ─────────────────────────────────────────
 * MEMBER           — the default for any signup not claiming a provider role.
 *                     Every authenticated user IS a member (can book, track
 *                     health, earn referral credit). This is the "user"
 *                     baseline, not a clinical identity.
 * REGIONAL_ADMIN   — manages provider roles + workflow templates. The ONE
 *                     role that cannot itself be created via CRUD (chicken
 *                     and egg).
 * SUPER admin      — env-bootstrapped super user; technically a REGIONAL_ADMIN
 *                     at the schema level with a flag.
 *
 * Legacy capability values (CORPORATE_ADMIN / INSURANCE_REP /
 * REFERRAL_PARTNER) are preserved in the Prisma enum for backward
 * compat with seeded users, but should NOT be referenced in new code —
 * those are capabilities acquired post-signup, not user types.
 */

export const SystemUserType = {
  MEMBER: 'MEMBER',
  REGIONAL_ADMIN: 'REGIONAL_ADMIN',
} as const;

export type SystemUserTypeValue = (typeof SystemUserType)[keyof typeof SystemUserType];

/**
 * @deprecated Import `SystemUserType` instead for system roles, or fetch
 *   provider roles from the DB. This alias maps the old names to values
 *   for a grace period while we migrate legacy call sites.
 *
 * Kept as a plain record (not `const`) so the names round-trip correctly
 * through record-key destructuring, but new code should prefer string
 * literals obtained from `/api/roles` or `RolesResolverService`.
 */
export const UserType: Record<string, string> = {
  MEMBER: 'MEMBER',
  REGIONAL_ADMIN: 'REGIONAL_ADMIN',
  // ── Legacy enum values — preserved for seeded data + backward compat.
  //    NEW CODE MUST NOT REFERENCE THESE. Fetch from DB instead.
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  NANNY: 'NANNY',
  PHARMACIST: 'PHARMACIST',
  LAB_TECHNICIAN: 'LAB_TECHNICIAN',
  EMERGENCY_WORKER: 'EMERGENCY_WORKER',
  INSURANCE_REP: 'INSURANCE_REP',
  CORPORATE_ADMIN: 'CORPORATE_ADMIN',
  REFERRAL_PARTNER: 'REFERRAL_PARTNER',
  CAREGIVER: 'CAREGIVER',
  PHYSIOTHERAPIST: 'PHYSIOTHERAPIST',
  DENTIST: 'DENTIST',
  OPTOMETRIST: 'OPTOMETRIST',
  NUTRITIONIST: 'NUTRITIONIST',
};

export type UserTypeValue = string; // intentionally loose — any code from ProviderRole.code

/** System-role predicates — prefer these over string equality. */
export const isMember = (code: string) => code === SystemUserType.MEMBER;
export const isRegionalAdmin = (code: string) => code === SystemUserType.REGIONAL_ADMIN;
