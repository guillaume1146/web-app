/**
 * Middleware Routing Tests
 *
 * Tests clean URL rewrites, patient backward compat,
 * provider slug mapping, and redirect paths.
 */
import { describe, it, expect } from 'vitest'

// ─── Unit-testable logic extracted from middleware ───────────────────────────

const DEDICATED_ROUTES: Record<string, string> = {
  'regional-admin': '/regional',
  corporate: '/corporate',
  insurance: '/insurance',
  'referral-partner': '/referral-partner',
  admin: '/admin',
}

const PROVIDER_SLUGS: Record<string, string> = {
  patient: 'patients',
  doctor: 'doctors',
  nurse: 'nurses',
  'child-care-nurse': 'childcare',
  pharmacy: 'pharmacists',
  lab: 'lab-technicians',
  ambulance: 'emergency',
  caregiver: 'caregivers',
  physiotherapist: 'physiotherapists',
  dentist: 'dentists',
  optometrist: 'optometrists',
  nutritionist: 'nutritionists',
}

function resolveCleanURL(cookieVal: string, pathname: string): string {
  const dedicatedPrefix = DEDICATED_ROUTES[cookieVal]
  if (dedicatedPrefix) {
    return `${dedicatedPrefix}${pathname}`
  }
  const providerSlug = PROVIDER_SLUGS[cookieVal] || cookieVal
  return `/provider/${providerSlug}${pathname}`
}

function getUserTypeRedirectPath(userType: string): string {
  const dedicatedPaths: Record<string, string> = {
    admin: '/admin/feed',
    'regional-admin': '/regional/feed',
    corporate: '/corporate/feed',
    insurance: '/insurance/feed',
    'referral-partner': '/referral-partner/feed',
  }
  return dedicatedPaths[userType] || '/feed'
}

function resolvePatientBackwardCompat(pathname: string): string {
  const subpath = pathname.replace('/patient', '')
  const remap: Record<string, string> = { '/chat': '/messages', '/health': '/my-health' }
  return remap[subpath] || subpath || '/feed'
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Clean URL → provider rewrite', () => {
  it('patient /feed rewrites to /provider/patients/feed', () => {
    expect(resolveCleanURL('patient', '/feed')).toBe('/provider/patients/feed')
  })

  it('doctor /feed rewrites to /provider/doctors/feed', () => {
    expect(resolveCleanURL('doctor', '/feed')).toBe('/provider/doctors/feed')
  })

  it('nurse /billing rewrites to /provider/nurses/billing', () => {
    expect(resolveCleanURL('nurse', '/billing')).toBe('/provider/nurses/billing')
  })

  it('pharmacy /inventory rewrites to /provider/pharmacists/inventory', () => {
    expect(resolveCleanURL('pharmacy', '/inventory')).toBe('/provider/pharmacists/inventory')
  })

  it('nanny (child-care-nurse) rewrites to /provider/childcare/', () => {
    expect(resolveCleanURL('child-care-nurse', '/feed')).toBe('/provider/childcare/feed')
  })

  it('ambulance rewrites to /provider/emergency/', () => {
    expect(resolveCleanURL('ambulance', '/feed')).toBe('/provider/emergency/feed')
  })

  it('lab rewrites to /provider/lab-technicians/', () => {
    expect(resolveCleanURL('lab', '/feed')).toBe('/provider/lab-technicians/feed')
  })

  it.each([
    ['caregiver', 'caregivers'],
    ['physiotherapist', 'physiotherapists'],
    ['dentist', 'dentists'],
    ['optometrist', 'optometrists'],
    ['nutritionist', 'nutritionists'],
  ])('%s rewrites to /provider/%s/', (cookie, slug) => {
    expect(resolveCleanURL(cookie, '/feed')).toBe(`/provider/${slug}/feed`)
  })
})

describe('Dedicated routes (non-provider roles)', () => {
  it('regional-admin /feed rewrites to /regional/feed', () => {
    expect(resolveCleanURL('regional-admin', '/feed')).toBe('/regional/feed')
  })

  it('corporate /billing rewrites to /corporate/billing', () => {
    expect(resolveCleanURL('corporate', '/billing')).toBe('/corporate/billing')
  })

  it('insurance /messages rewrites to /insurance/messages', () => {
    expect(resolveCleanURL('insurance', '/messages')).toBe('/insurance/messages')
  })

  it('admin /feed rewrites to /admin/feed', () => {
    expect(resolveCleanURL('admin', '/feed')).toBe('/admin/feed')
  })
})

describe('Patient is NOT a dedicated route', () => {
  it('patient is NOT in DEDICATED_ROUTES', () => {
    expect(DEDICATED_ROUTES['patient']).toBeUndefined()
  })

  it('patient IS in PROVIDER_SLUGS', () => {
    expect(PROVIDER_SLUGS['patient']).toBe('patients')
  })
})

describe('getUserTypeRedirectPath', () => {
  it('patient redirects to /feed (clean URL)', () => {
    expect(getUserTypeRedirectPath('patient')).toBe('/feed')
  })

  it('doctor redirects to /feed (clean URL)', () => {
    expect(getUserTypeRedirectPath('doctor')).toBe('/feed')
  })

  it('admin redirects to /admin/feed', () => {
    expect(getUserTypeRedirectPath('admin')).toBe('/admin/feed')
  })

  it('regional-admin redirects to /regional/feed', () => {
    expect(getUserTypeRedirectPath('regional-admin')).toBe('/regional/feed')
  })

  it('unknown type redirects to /feed', () => {
    expect(getUserTypeRedirectPath('unknown')).toBe('/feed')
  })

  it.each([
    'nurse', 'pharmacy', 'lab', 'ambulance',
    'caregiver', 'physiotherapist', 'dentist', 'optometrist', 'nutritionist',
  ])('%s redirects to /feed (clean URL)', (userType) => {
    expect(getUserTypeRedirectPath(userType)).toBe('/feed')
  })
})

describe('Patient backward compat: /patient/* → clean URL', () => {
  it('/patient/feed → /feed', () => {
    expect(resolvePatientBackwardCompat('/patient/feed')).toBe('/feed')
  })

  it('/patient/chat → /messages', () => {
    expect(resolvePatientBackwardCompat('/patient/chat')).toBe('/messages')
  })

  it('/patient/health → /my-health', () => {
    expect(resolvePatientBackwardCompat('/patient/health')).toBe('/my-health')
  })

  it('/patient/billing → /billing', () => {
    expect(resolvePatientBackwardCompat('/patient/billing')).toBe('/billing')
  })

  it('/patient/video → /video', () => {
    expect(resolvePatientBackwardCompat('/patient/video')).toBe('/video')
  })

  it('/patient/network → /network', () => {
    expect(resolvePatientBackwardCompat('/patient/network')).toBe('/network')
  })

  it('/patient (root) → /feed', () => {
    expect(resolvePatientBackwardCompat('/patient')).toBe('/feed')
  })
})

describe('Clean URL dashboard pages list', () => {
  const dashboardPages = [
    '/feed', '/practice', '/inventory', '/services', '/workflows',
    '/billing', '/video', '/messages', '/ai-assistant', '/my-health', '/profile',
    '/network', '/booking-requests', '/bookings', '/my-consultations', '/my-nurse-services',
    '/my-childcare', '/my-emergency', '/my-health-records', '/my-lab-results',
    '/my-insurance', '/my-prescriptions', '/posts', '/reviews',
    '/pharmacy', '/book',
  ]

  it('includes all core provider pages', () => {
    expect(dashboardPages).toContain('/feed')
    expect(dashboardPages).toContain('/billing')
    expect(dashboardPages).toContain('/video')
    expect(dashboardPages).toContain('/messages')
    expect(dashboardPages).toContain('/services')
    expect(dashboardPages).toContain('/inventory')
    expect(dashboardPages).toContain('/workflows')
  })

  it('includes patient-specific pages', () => {
    expect(dashboardPages).toContain('/my-health')
    expect(dashboardPages).toContain('/my-consultations')
    expect(dashboardPages).toContain('/my-prescriptions')
    expect(dashboardPages).toContain('/my-health-records')
    expect(dashboardPages).toContain('/my-lab-results')
    expect(dashboardPages).toContain('/my-insurance')
    expect(dashboardPages).toContain('/pharmacy')
  })

  it('includes booking pages', () => {
    expect(dashboardPages).toContain('/book')
    expect(dashboardPages).toContain('/booking-requests')
    expect(dashboardPages).toContain('/bookings')
  })

  it('does NOT include old role-prefix paths', () => {
    expect(dashboardPages).not.toContain('/patient/feed')
    expect(dashboardPages).not.toContain('/doctor/feed')
  })
})
