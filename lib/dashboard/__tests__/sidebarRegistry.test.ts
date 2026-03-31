/**
 * Sidebar Registry & Feature Config Tests
 */
import { describe, it, expect } from 'vitest'
import { getSidebarConfig, getUserTypeSlug } from '../sidebarRegistry'
import { filterSidebarByFeatures } from '@/hooks/useRoleFeatureConfig'

describe('getSidebarConfig', () => {
  it('returns null for PATIENT (now a provider role)', () => {
    expect(getSidebarConfig('PATIENT')).toBeNull()
  })

  it('returns config for INSURANCE_REP', () => {
    const config = getSidebarConfig('INSURANCE_REP')
    expect(config).not.toBeNull()
    expect(config!.userSubtitle).toBe('Insurance')
    expect(config!.items.length).toBeGreaterThan(0)
  })

  it('returns config for CORPORATE_ADMIN', () => {
    const config = getSidebarConfig('CORPORATE_ADMIN')
    expect(config).not.toBeNull()
    expect(config!.userSubtitle).toBe('Corporate')
  })

  it('returns config for REFERRAL_PARTNER', () => {
    const config = getSidebarConfig('REFERRAL_PARTNER')
    expect(config).not.toBeNull()
    expect(config!.userSubtitle).toBe('Referral Partner')
  })

  it('returns config for REGIONAL_ADMIN', () => {
    const config = getSidebarConfig('REGIONAL_ADMIN')
    expect(config).not.toBeNull()
    expect(config!.userSubtitle).toBe('Regional Admin')
  })

  it('returns null for unknown user type', () => {
    expect(getSidebarConfig('UNKNOWN')).toBeNull()
  })

  it('returns null for provider types (they use dynamic layout)', () => {
    expect(getSidebarConfig('DOCTOR')).toBeNull()
    expect(getSidebarConfig('NURSE')).toBeNull()
    expect(getSidebarConfig('PHARMACIST')).toBeNull()
  })
})

describe('getUserTypeSlug', () => {
  it('returns null for PATIENT (no longer dedicated)', () => {
    expect(getUserTypeSlug('PATIENT')).toBeNull()
  })

  it('returns correct slugs for non-provider roles', () => {
    expect(getUserTypeSlug('INSURANCE_REP')).toBe('insurance')
    expect(getUserTypeSlug('CORPORATE_ADMIN')).toBe('corporate')
    expect(getUserTypeSlug('REFERRAL_PARTNER')).toBe('referral-partner')
    expect(getUserTypeSlug('REGIONAL_ADMIN')).toBe('regional')
  })

  it('returns null for provider types', () => {
    expect(getUserTypeSlug('DOCTOR')).toBeNull()
    expect(getUserTypeSlug('NURSE')).toBeNull()
  })
})

describe('filterSidebarByFeatures', () => {
  const items = [
    { id: 'feed', label: 'Feed' },
    { id: 'services', label: 'My Services' },
    { id: 'practice', label: 'My Practice' },
    { id: 'billing', label: 'Billing' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'workflows', label: 'Workflows' },
  ]

  it('returns all items when allEnabled=true', () => {
    const result = filterSidebarByFeatures(items, { allEnabled: true, features: {}, loading: false })
    expect(result).toHaveLength(items.length)
  })

  it('returns all items when loading', () => {
    const result = filterSidebarByFeatures(items, { allEnabled: false, features: { services: false }, loading: true })
    expect(result).toHaveLength(items.length)
  })

  it('filters out disabled features', () => {
    const config = {
      allEnabled: false,
      features: { services: false, practice: false, workflows: false, inventory: false },
      loading: false,
    }
    const result = filterSidebarByFeatures(items, config)
    expect(result).toHaveLength(2)
    expect(result.map(i => i.id)).toEqual(['feed', 'billing'])
  })

  it('keeps items not mentioned in features (default enabled)', () => {
    const config = {
      allEnabled: false,
      features: { services: false },
      loading: false,
    }
    const result = filterSidebarByFeatures(items, config)
    expect(result).toHaveLength(5) // all except services
    expect(result.find(i => i.id === 'services')).toBeUndefined()
  })

  it('keeps items with features[id] === true', () => {
    const config = {
      allEnabled: false,
      features: { services: true, practice: false },
      loading: false,
    }
    const result = filterSidebarByFeatures(items, config)
    expect(result.find(i => i.id === 'services')).toBeDefined()
    expect(result.find(i => i.id === 'practice')).toBeUndefined()
  })

  it('patient config hides services, practice, workflows, inventory', () => {
    // Simulates the PATIENT RoleFeatureConfig seed
    const patientConfig = {
      allEnabled: false,
      features: {
        feed: true, overview: true, billing: true, video: true, messages: true,
        'ai-assistant': true, 'my-health': true,
        services: false, practice: false, workflows: false, inventory: false,
      },
      loading: false,
    }
    const result = filterSidebarByFeatures(items, patientConfig)
    expect(result.find(i => i.id === 'feed')).toBeDefined()
    expect(result.find(i => i.id === 'billing')).toBeDefined()
    expect(result.find(i => i.id === 'services')).toBeUndefined()
    expect(result.find(i => i.id === 'practice')).toBeUndefined()
    expect(result.find(i => i.id === 'workflows')).toBeUndefined()
    expect(result.find(i => i.id === 'inventory')).toBeUndefined()
  })
})
