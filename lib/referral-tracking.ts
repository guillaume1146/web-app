/**
 * Client-side referral tracking utilities.
 * Captures UTM params from URL, persists in sessionStorage,
 * and provides helpers for the registration flow.
 */

const STORAGE_KEY = 'mediwyz_referral_params'
const TRACKING_ID_KEY = 'mediwyz_referral_tracking_id'

export interface ReferralParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  promo?: string
  location?: string
  landing_page?: string
}

/** Read UTM params from current URL search params */
export function captureReferralParams(): ReferralParams | null {
  if (typeof window === 'undefined') return null

  const url = new URL(window.location.href)
  const params: ReferralParams = {}
  let hasAny = false

  const keys: (keyof ReferralParams)[] = ['utm_source', 'utm_medium', 'utm_campaign', 'promo', 'location']
  for (const key of keys) {
    const val = url.searchParams.get(key)
    if (val) {
      params[key] = val
      hasAny = true
    }
  }

  if (!hasAny) return null

  params.landing_page = window.location.pathname

  // Save to sessionStorage so params survive navigation
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  } catch {
    // sessionStorage not available
  }

  return params
}

/** Get stored referral params (from sessionStorage) */
export function getReferralParams(): ReferralParams | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/** Store the tracking ID returned by the API */
export function setTrackingId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(TRACKING_ID_KEY, id)
  } catch {
    // ignore
  }
}

/** Get stored tracking ID */
export function getTrackingId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(TRACKING_ID_KEY)
  } catch {
    return null
  }
}

/** Clear all referral tracking data after registration */
export function clearReferralTracking(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(TRACKING_ID_KEY)
  } catch {
    // ignore
  }
}

/** Build URL search params string to append when navigating (e.g. landing -> signup) */
export function buildReferralQueryString(): string {
  const params = getReferralParams()
  if (!params) return ''

  const sp = new URLSearchParams()
  if (params.utm_source) sp.set('utm_source', params.utm_source)
  if (params.utm_medium) sp.set('utm_medium', params.utm_medium)
  if (params.utm_campaign) sp.set('utm_campaign', params.utm_campaign)
  if (params.promo) sp.set('promo', params.promo)
  if (params.location) sp.set('location', params.location)

  const str = sp.toString()
  return str ? `?${str}` : ''
}
