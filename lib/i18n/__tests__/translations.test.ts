/**
 * I18n Translation Tests
 *
 * Verifies:
 * - All 3 languages have the same keys (no missing translations)
 * - Translation values are non-empty strings
 * - Key naming conventions are consistent
 * - New keys added for roles, signup, search, network are present
 */
import { describe, it, expect } from 'vitest'
import en from '../translations/en'
import fr from '../translations/fr'
import kr from '../translations/kr'

const enKeys = Object.keys(en) as (keyof typeof en)[]
const frKeys = Object.keys(fr)
const krKeys = Object.keys(kr)

describe('Translation key parity', () => {
  it('French has all English keys', () => {
    const missing = enKeys.filter(k => !frKeys.includes(k))
    expect(missing, `Missing French keys: ${missing.join(', ')}`).toHaveLength(0)
  })

  it('Kreol has all English keys', () => {
    const missing = enKeys.filter(k => !krKeys.includes(k))
    expect(missing, `Missing Kreol keys: ${missing.join(', ')}`).toHaveLength(0)
  })

  it('French has no extra keys missing from English', () => {
    const extra = frKeys.filter(k => !enKeys.includes(k as keyof typeof en))
    expect(extra, `Extra French keys: ${extra.join(', ')}`).toHaveLength(0)
  })

  it('Kreol has no extra keys missing from English', () => {
    const extra = krKeys.filter(k => !enKeys.includes(k as keyof typeof en))
    expect(extra, `Extra Kreol keys: ${extra.join(', ')}`).toHaveLength(0)
  })
})

describe('Translation values are non-empty', () => {
  it('English values are non-empty strings', () => {
    for (const key of enKeys) {
      expect(en[key], `en['${key}'] is empty`).toBeTruthy()
      expect(typeof en[key]).toBe('string')
    }
  })

  it('French values are non-empty strings', () => {
    for (const key of frKeys) {
      const val = (fr as Record<string, string>)[key]
      expect(val, `fr['${key}'] is empty`).toBeTruthy()
    }
  })

  it('Kreol values are non-empty strings', () => {
    for (const key of krKeys) {
      const val = (kr as Record<string, string>)[key]
      expect(val, `kr['${key}'] is empty`).toBeTruthy()
    }
  })
})

describe('Key naming conventions', () => {
  it('all keys follow namespace.camelCase pattern', () => {
    for (const key of enKeys) {
      expect(key).toMatch(/^[a-z]+\.[a-zA-Z]+$/)
    }
  })

  it('has expected namespaces', () => {
    const namespaces = new Set(enKeys.map(k => k.split('.')[0]))
    expect(namespaces).toContain('common')
    expect(namespaces).toContain('medical')
    expect(namespaces).toContain('nav')
    expect(namespaces).toContain('auth')
    expect(namespaces).toContain('error')
    expect(namespaces).toContain('dashboard')
    expect(namespaces).toContain('booking')
    expect(namespaces).toContain('search')
  })
})

describe('Navigation keys for sidebar', () => {
  it('has nav keys for core sidebar items', () => {
    expect(en['nav.feed']).toBe('Feed')
    expect(en['nav.overview']).toBe('Dashboard')
    expect(en['nav.billing']).toBe('Billing')
    expect(en['nav.video']).toBe('Video Call')
    expect(en['nav.messages']).toBe('Messages')
  })

  it('has nav keys for provider sidebar items', () => {
    expect(en['nav.practice']).toBe('My Practice')
    expect(en['nav.services']).toBe('My Services')
    expect(en['nav.inventory']).toBe('Inventory')
    expect(en['nav.workflows']).toBe('Workflows')
  })

  it('has nav keys for patient sidebar items', () => {
    expect(en['nav.health']).toBe('My Health')
    expect(en['nav.aiAssistant']).toBe('AI Health Assistant')
    expect(en['nav.consultations']).toBe('Doctor Consultations')
    expect(en['nav.prescriptions']).toBe('Prescriptions')
  })

  it('French has translated nav keys', () => {
    expect((fr as Record<string, string>)['nav.practice']).toBe('Mon Cabinet')
    expect((fr as Record<string, string>)['nav.services']).toBe('Mes Services')
    expect((fr as Record<string, string>)['nav.health']).toBe('Ma Sante')
  })

  it('Kreol has translated nav keys', () => {
    expect((kr as Record<string, string>)['nav.practice']).toBe('Mo Kabine')
    expect((kr as Record<string, string>)['nav.services']).toBe('Mo Servis')
    expect((kr as Record<string, string>)['nav.health']).toBe('Mo Lasante')
  })
})

describe('Role translation keys', () => {
  const roles = [
    'patient', 'doctor', 'nurse', 'nanny', 'pharmacist', 'labTechnician',
    'emergencyWorker', 'insuranceRep', 'corporateAdmin', 'referralPartner',
    'regionalAdmin', 'caregiver', 'physiotherapist', 'dentist', 'optometrist', 'nutritionist',
  ]

  it('English has all role keys', () => {
    for (const role of roles) {
      expect(en[`role.${role}` as keyof typeof en], `Missing en role.${role}`).toBeDefined()
    }
  })

  it('French has all role keys', () => {
    for (const role of roles) {
      expect((fr as Record<string, string>)[`role.${role}`], `Missing fr role.${role}`).toBeDefined()
    }
  })

  it('Kreol has all role keys', () => {
    for (const role of roles) {
      expect((kr as Record<string, string>)[`role.${role}`], `Missing kr role.${role}`).toBeDefined()
    }
  })
})

describe('Signup translation keys', () => {
  const signupKeys = [
    'signup.selectAccountType', 'signup.accountTypeDesc', 'signup.requiredDocs',
    'signup.docsReady', 'signup.basicInfo', 'signup.documentUpload',
    'signup.subscription', 'signup.verification',
  ]

  it('all 3 languages have signup keys', () => {
    for (const key of signupKeys) {
      expect(en[key as keyof typeof en], `Missing en ${key}`).toBeDefined()
      expect((fr as Record<string, string>)[key], `Missing fr ${key}`).toBeDefined()
      expect((kr as Record<string, string>)[key], `Missing kr ${key}`).toBeDefined()
    }
  })
})

describe('Network/search translation keys', () => {
  it('has network keys in all languages', () => {
    expect(en['network.peopleYouMayKnow']).toBe('People You May Know')
    expect((fr as Record<string, string>)['network.peopleYouMayKnow']).toBeTruthy()
    expect((kr as Record<string, string>)['network.peopleYouMayKnow']).toBeTruthy()
  })

  it('has search keys in all languages', () => {
    expect(en['search.findProviders']).toBe('Find Providers')
    expect((fr as Record<string, string>)['search.findProviders']).toBeTruthy()
    expect((kr as Record<string, string>)['search.findProviders']).toBeTruthy()
  })
})

describe('Translation count', () => {
  it('has at least 200 translation keys', () => {
    expect(enKeys.length).toBeGreaterThanOrEqual(200)
  })

  it('all 3 languages have the same count', () => {
    expect(frKeys.length).toBe(enKeys.length)
    expect(krKeys.length).toBe(enKeys.length)
  })
})
