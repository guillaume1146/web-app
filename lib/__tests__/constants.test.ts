import { describe, it, expect } from 'vitest'
import { USER_TYPE_LABELS, USER_TYPE_SLUGS, PLATFORM_FEES } from '../constants'

describe('USER_TYPE_LABELS', () => {
  it('has labels for all 11 user types', () => {
    const expectedTypes = [
      'MEMBER', 'DOCTOR', 'NURSE', 'NANNY', 'PHARMACIST',
      'LAB_TECHNICIAN', 'EMERGENCY_WORKER', 'INSURANCE_REP',
      'CORPORATE_ADMIN', 'REFERRAL_PARTNER', 'REGIONAL_ADMIN',
    ]

    for (const type of expectedTypes) {
      expect(USER_TYPE_LABELS[type]).toBeDefined()
      expect(typeof USER_TYPE_LABELS[type]).toBe('string')
      expect(USER_TYPE_LABELS[type].length).toBeGreaterThan(0)
    }
  })
})

describe('USER_TYPE_SLUGS', () => {
  it('has slugs for all 11 user types', () => {
    const expectedTypes = [
      'MEMBER', 'DOCTOR', 'NURSE', 'NANNY', 'PHARMACIST',
      'LAB_TECHNICIAN', 'EMERGENCY_WORKER', 'INSURANCE_REP',
      'CORPORATE_ADMIN', 'REFERRAL_PARTNER', 'REGIONAL_ADMIN',
    ]

    for (const type of expectedTypes) {
      expect(USER_TYPE_SLUGS[type]).toBeDefined()
      expect(USER_TYPE_SLUGS[type]).toMatch(/^[a-z-]+$/)
    }
  })

  it('maps specific types to correct slugs', () => {
    expect(USER_TYPE_SLUGS['MEMBER']).toBe('patient')
    expect(USER_TYPE_SLUGS['DOCTOR']).toBe('doctor')
    expect(USER_TYPE_SLUGS['EMERGENCY_WORKER']).toBe('responder')
    expect(USER_TYPE_SLUGS['REGIONAL_ADMIN']).toBe('regional')
    expect(USER_TYPE_SLUGS['LAB_TECHNICIAN']).toBe('lab-technician')
  })
})

describe('PLATFORM_FEES', () => {
  it('has fee rates between 0 and 1', () => {
    for (const [, fee] of Object.entries(PLATFORM_FEES)) {
      expect(fee).toBeGreaterThan(0)
      expect(fee).toBeLessThanOrEqual(1)
    }
  })

  it('includes expected provider types', () => {
    expect(PLATFORM_FEES.doctor).toBeDefined()
    expect(PLATFORM_FEES.nurse).toBeDefined()
    expect(PLATFORM_FEES.pharmacist).toBeDefined()
  })
})
