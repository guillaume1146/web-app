import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  captureReferralParams,
  getReferralParams,
  setTrackingId,
  getTrackingId,
  clearReferralTracking,
  buildReferralQueryString,
} from '../referral-tracking'

// Mock sessionStorage
const mockStorage: Record<string, string> = {}
const mockSessionStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
}

Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage })

describe('referral-tracking utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockStorage)) delete mockStorage[key]
  })

  describe('captureReferralParams', () => {
    it('returns null if no UTM params in URL', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost:3000/signup', pathname: '/signup' },
        writable: true,
      })
      const result = captureReferralParams()
      expect(result).toBeNull()
    })

    it('captures UTM params from URL and stores in sessionStorage', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/signup?utm_source=facebook&utm_medium=social&utm_campaign=test_campaign&promo=PARTNER1&location=mauritius',
          pathname: '/signup',
        },
        writable: true,
      })

      const result = captureReferralParams()
      expect(result).toEqual({
        utm_source: 'facebook',
        utm_medium: 'social',
        utm_campaign: 'test_campaign',
        promo: 'PARTNER1',
        location: 'mauritius',
        landing_page: '/signup',
      })

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'mediwyz_referral_params',
        expect.any(String)
      )
    })

    it('captures partial UTM params', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000/signup?promo=CODE1',
          pathname: '/signup',
        },
        writable: true,
      })

      const result = captureReferralParams()
      expect(result).not.toBeNull()
      expect(result?.promo).toBe('CODE1')
      expect(result?.utm_source).toBeUndefined()
    })
  })

  describe('getReferralParams', () => {
    it('returns null when nothing stored', () => {
      expect(getReferralParams()).toBeNull()
    })

    it('returns stored params from sessionStorage', () => {
      const params = { promo: 'CODE1', utm_source: 'linkedin' }
      mockStorage['mediwyz_referral_params'] = JSON.stringify(params)

      const result = getReferralParams()
      expect(result).toEqual(params)
    })
  })

  describe('tracking ID', () => {
    it('stores and retrieves tracking ID', () => {
      setTrackingId('track-123')
      expect(mockStorage['mediwyz_referral_tracking_id']).toBe('track-123')
      expect(getTrackingId()).toBe('track-123')
    })

    it('returns null when no tracking ID stored', () => {
      expect(getTrackingId()).toBeNull()
    })
  })

  describe('clearReferralTracking', () => {
    it('removes all referral data from sessionStorage', () => {
      mockStorage['mediwyz_referral_params'] = '{"promo":"CODE1"}'
      mockStorage['mediwyz_referral_tracking_id'] = 'track-123'

      clearReferralTracking()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('mediwyz_referral_params')
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('mediwyz_referral_tracking_id')
    })
  })

  describe('buildReferralQueryString', () => {
    it('returns empty string when no params', () => {
      expect(buildReferralQueryString()).toBe('')
    })

    it('builds query string from stored params', () => {
      const params = {
        utm_source: 'instagram',
        utm_medium: 'social',
        promo: 'CODE1',
        location: 'madagascar',
      }
      mockStorage['mediwyz_referral_params'] = JSON.stringify(params)

      const result = buildReferralQueryString()
      expect(result).toContain('utm_source=instagram')
      expect(result).toContain('utm_medium=social')
      expect(result).toContain('promo=CODE1')
      expect(result).toContain('location=madagascar')
      expect(result.startsWith('?')).toBe(true)
    })
  })
})
