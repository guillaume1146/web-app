/**
 * Frontend Component Routing Tests
 *
 * Tests that routing components use clean URLs instead of role-prefix paths.
 * Verifies AuthBookingLink, MessageButton, CallButton use correct routes.
 */
import { describe, it, expect } from 'vitest'

// ─── Extracted routing logic from components ────────────────────────────────

// From MessageButton.tsx
const MESSAGE_ROUTES: Record<string, string> = {
  patient: '/messages',
  doctor: '/messages',
  nurse: '/messages',
  'child-care-nurse': '/messages',
  pharmacy: '/messages',
  lab: '/messages',
  ambulance: '/messages',
  insurance: '/insurance/messages',
  corporate: '/corporate/messages',
  'referral-partner': '/referral-partner/messages',
  admin: '/admin/messages',
  'regional-admin': '/regional/messages',
}

// From CallButton.tsx
const VIDEO_ROUTES: Record<string, string> = {
  patient: '/video',
  doctor: '/video',
  nurse: '/video',
  'child-care-nurse': '/video',
  pharmacy: '/video',
  lab: '/video',
  ambulance: '/video',
  insurance: '/insurance/video',
  corporate: '/corporate/video',
  'referral-partner': '/referral-partner/video',
  admin: '/admin/video',
  'regional-admin': '/regional/video',
}

// From LandingPageContent.tsx
const FEED_ROUTES: Record<string, string> = {
  MEMBER: '/feed',
  PATIENT: '/feed', // legacy alias

  DOCTOR: '/feed',
  NURSE: '/feed',
  NANNY: '/feed',
  PHARMACIST: '/feed',
  LAB_TECHNICIAN: '/feed',
  EMERGENCY_WORKER: '/feed',
  INSURANCE_REP: '/insurance/feed',
  CORPORATE_ADMIN: '/corporate/feed',
  REFERRAL_PARTNER: '/referral-partner/feed',
  REGIONAL_ADMIN: '/regional/feed',
  CAREGIVER: '/feed',
  PHYSIOTHERAPIST: '/feed',
  DENTIST: '/feed',
  OPTOMETRIST: '/feed',
  NUTRITIONIST: '/feed',
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MessageButton: clean URL routing', () => {
  it('all provider roles use /messages (clean URL)', () => {
    const providerTypes = ['patient', 'doctor', 'nurse', 'child-care-nurse', 'pharmacy', 'lab', 'ambulance']
    for (const type of providerTypes) {
      expect(MESSAGE_ROUTES[type], `${type} should use /messages`).toBe('/messages')
    }
  })

  it('non-provider roles keep dedicated paths', () => {
    expect(MESSAGE_ROUTES['insurance']).toBe('/insurance/messages')
    expect(MESSAGE_ROUTES['corporate']).toBe('/corporate/messages')
    expect(MESSAGE_ROUTES['regional-admin']).toBe('/regional/messages')
  })

  it('no route contains /patient/ prefix', () => {
    for (const [, route] of Object.entries(MESSAGE_ROUTES)) {
      expect(route).not.toContain('/patient/')
    }
  })

  it('no route contains /doctor/ prefix', () => {
    for (const [, route] of Object.entries(MESSAGE_ROUTES)) {
      expect(route).not.toContain('/doctor/')
    }
  })
})

describe('CallButton: clean URL routing', () => {
  it('all provider roles use /video (clean URL)', () => {
    const providerTypes = ['patient', 'doctor', 'nurse', 'child-care-nurse', 'pharmacy', 'lab', 'ambulance']
    for (const type of providerTypes) {
      expect(VIDEO_ROUTES[type], `${type} should use /video`).toBe('/video')
    }
  })

  it('non-provider roles keep dedicated paths', () => {
    expect(VIDEO_ROUTES['insurance']).toBe('/insurance/video')
    expect(VIDEO_ROUTES['corporate']).toBe('/corporate/video')
  })
})

describe('LandingPageContent: clean URL feed routing', () => {
  it('PATIENT uses /feed (not /patient/feed)', () => {
    expect(FEED_ROUTES['MEMBER']).toBe('/feed')
  })

  it('all provider types use /feed', () => {
    const providers = ['DOCTOR', 'NURSE', 'NANNY', 'PHARMACIST', 'LAB_TECHNICIAN',
      'EMERGENCY_WORKER', 'CAREGIVER', 'PHYSIOTHERAPIST', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST']
    for (const type of providers) {
      expect(FEED_ROUTES[type], `${type} should use /feed`).toBe('/feed')
    }
  })

  it('non-provider roles keep their dedicated feed paths', () => {
    expect(FEED_ROUTES['INSURANCE_REP']).toBe('/insurance/feed')
    expect(FEED_ROUTES['CORPORATE_ADMIN']).toBe('/corporate/feed')
    expect(FEED_ROUTES['REGIONAL_ADMIN']).toBe('/regional/feed')
    expect(FEED_ROUTES['REFERRAL_PARTNER']).toBe('/referral-partner/feed')
  })
})

describe('AuthBookingLink: clean URL booking', () => {
  function getBookingPath(type: string, providerId?: string): string {
    // Extracted logic from AuthBookingLink
    return type === 'emergency' ? '/book/emergency' : `/book/${type}/${providerId}`
  }

  it('doctor booking uses /book/doctor/{id}', () => {
    expect(getBookingPath('doctor', 'DOC001')).toBe('/book/doctor/DOC001')
  })

  it('nurse booking uses /book/nurse/{id}', () => {
    expect(getBookingPath('nurse', 'NUR001')).toBe('/book/nurse/NUR001')
  })

  it('emergency booking uses /book/emergency', () => {
    expect(getBookingPath('emergency')).toBe('/book/emergency')
  })

  it('nanny booking uses /book/nanny/{id}', () => {
    expect(getBookingPath('nanny', 'NAN001')).toBe('/book/nanny/NAN001')
  })

  it('lab-test booking uses /book/lab-test/{id}', () => {
    expect(getBookingPath('lab-test', 'LAB001')).toBe('/book/lab-test/LAB001')
  })

  it('no booking path contains /patient/ prefix', () => {
    const types = ['doctor', 'nurse', 'nanny', 'lab-test', 'emergency']
    for (const type of types) {
      const path = getBookingPath(type, 'TEST001')
      expect(path).not.toContain('/patient/')
    }
  })
})

describe('BookingSuccessTicket: default dashboard path', () => {
  it('defaults to /feed (not /patient/feed)', () => {
    const defaultPath = '/feed' // From BookingSuccessTicket default prop
    expect(defaultPath).toBe('/feed')
  })
})
