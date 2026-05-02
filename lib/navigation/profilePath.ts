/**
 * Resolves the correct profile URL for any user type.
 *
 * Routing layout:
 *   - Top-level dashboards: /patient, /admin, /corporate, /insurance, /regional, /referral-partner
 *   - All provider types (doctor, nurse, child-care-nurse, pharmacy, lab, ambulance,
 *     caregiver, physiotherapist, dentist, optometrist, nutritionist) are served
 *     by the dynamic /provider/[slug]/... route.
 *
 * Accepts the cookie-style userType string (e.g. 'insurance', 'doctor',
 * 'child-care-nurse').
 */
/**
 * Cookie userType → top-level dashboard URL segment.
 * Only these user types have a dedicated /<segment>/ route tree.
 * Everything else (doctor, nurse, pharmacy, …) is served by /provider/[slug]/.
 */
const TOP_LEVEL_SEGMENT: Record<string, string> = {
  patient: 'patient',
  admin: 'admin',
  corporate: 'corporate',
  insurance: 'insurance',
  'regional-admin': 'regional',
  'referral-partner': 'referral-partner',
}

export function getDashboardBase(userType?: string | null): string {
  if (!userType) return '/login'
  const top = TOP_LEVEL_SEGMENT[userType]
  return top ? `/${top}` : `/provider/${userType}`
}

export function getProfilePath(userType?: string | null, tab?: string): string {
  if (!userType) return tab ? `/login?tab=${tab}` : '/login'
  const base = `${getDashboardBase(userType)}/profile`
  return tab ? `${base}?tab=${tab}` : base
}

export function getDashboardPath(userType?: string | null): string {
  return getDashboardBase(userType)
}
