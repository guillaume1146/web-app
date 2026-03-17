import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getVolumeDiscount, calculateCorporatePlanCost } from '../corporate'

describe('Corporate subscription logic', () => {
  describe('getVolumeDiscount', () => {
    const discounts = { volume_50: 5, volume_100: 10, volume_300: 15 }

    it('returns 0% for less than 50 employees', () => {
      expect(getVolumeDiscount(49, discounts)).toEqual({ discountPercent: 0, tier: 'standard' })
    })

    it('returns 5% for 50-99 employees', () => {
      expect(getVolumeDiscount(50, discounts)).toEqual({ discountPercent: 5, tier: '50-99' })
      expect(getVolumeDiscount(99, discounts)).toEqual({ discountPercent: 5, tier: '50-99' })
    })

    it('returns 10% for 100-299 employees', () => {
      expect(getVolumeDiscount(100, discounts)).toEqual({ discountPercent: 10, tier: '100-299' })
      expect(getVolumeDiscount(250, discounts)).toEqual({ discountPercent: 10, tier: '100-299' })
    })

    it('returns 15% for 300-999 employees', () => {
      expect(getVolumeDiscount(300, discounts)).toEqual({ discountPercent: 15, tier: '300-999' })
      expect(getVolumeDiscount(500, discounts)).toEqual({ discountPercent: 15, tier: '300-999' })
    })

    it('returns 0% when no discounts provided', () => {
      expect(getVolumeDiscount(200, null)).toEqual({ discountPercent: 0, tier: 'standard' })
    })

    it('handles missing tiers gracefully', () => {
      expect(getVolumeDiscount(200, { volume_50: 5 })).toEqual({ discountPercent: 5, tier: '50-99' })
    })
  })

  describe('calculateCorporatePlanCost', () => {
    it('calculates cost without volume discount', () => {
      const result = calculateCorporatePlanCost({
        planPrice: 1199,
        employeeCount: 30,
        discounts: null,
      })
      expect(result.pricePerEmployee).toBe(1199)
      expect(result.volumeDiscountPercent).toBe(0)
      expect(result.discountedPricePerEmployee).toBe(1199)
      expect(result.totalMonthly).toBe(1199 * 30)
    })

    it('applies 10% volume discount for 200 employees', () => {
      const result = calculateCorporatePlanCost({
        planPrice: 1199,
        employeeCount: 200,
        discounts: { volume_50: 5, volume_100: 10, volume_300: 15 },
      })
      expect(result.volumeDiscountPercent).toBe(10)
      // 1199 * 0.90 = 1079.1 → rounded to 1079
      expect(result.discountedPricePerEmployee).toBe(1079)
      expect(result.totalMonthly).toBe(1079 * 200)
    })

    it('applies 15% volume discount for 500 employees', () => {
      const result = calculateCorporatePlanCost({
        planPrice: 1199,
        employeeCount: 500,
        discounts: { volume_50: 5, volume_100: 10, volume_300: 15 },
      })
      expect(result.volumeDiscountPercent).toBe(15)
      // 1199 * 0.85 = 1019.15 → rounded to 1019
      expect(result.discountedPricePerEmployee).toBe(1019)
      expect(result.totalMonthly).toBe(1019 * 500)
    })
  })
})
