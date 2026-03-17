import { describe, it, expect } from 'vitest'
import { formatCurrency, getCurrencySymbol, getEquivalentAmount, CURRENCIES } from '../currency'

describe('Currency utilities', () => {
  describe('CURRENCIES', () => {
    it('should contain all expected currencies', () => {
      expect(Object.keys(CURRENCIES)).toContain('MUR')
      expect(Object.keys(CURRENCIES)).toContain('MGA')
      expect(Object.keys(CURRENCIES)).toContain('KES')
      expect(Object.keys(CURRENCIES)).toContain('XOF')
      expect(Object.keys(CURRENCIES)).toContain('RWF')
      expect(Object.keys(CURRENCIES)).toContain('USD')
      expect(Object.keys(CURRENCIES)).toContain('EUR')
    })
  })

  describe('formatCurrency', () => {
    it('should format MUR correctly', () => {
      expect(formatCurrency(4500, 'MUR')).toBe('Rs 4,500')
    })

    it('should format MGA correctly', () => {
      expect(formatCurrency(180000, 'MGA')).toBe('Ar 180,000')
    })

    it('should format KES correctly', () => {
      expect(formatCurrency(5800, 'KES')).toBe('KSh 5,800')
    })

    it('should format XOF correctly', () => {
      expect(formatCurrency(25000, 'XOF')).toBe('CFA 25,000')
    })

    it('should format USD with decimals', () => {
      expect(formatCurrency(99.50, 'USD')).toBe('$ 99.50')
    })

    it('should default to MUR if no code provided', () => {
      expect(formatCurrency(1000)).toBe('Rs 1,000')
    })

    it('should handle unknown currency', () => {
      expect(formatCurrency(1000, 'XYZ')).toBe('1,000')
    })
  })

  describe('getCurrencySymbol', () => {
    it('should return correct symbols', () => {
      expect(getCurrencySymbol('MUR')).toBe('Rs')
      expect(getCurrencySymbol('MGA')).toBe('Ar')
      expect(getCurrencySymbol('KES')).toBe('KSh')
      expect(getCurrencySymbol('XOF')).toBe('CFA')
      expect(getCurrencySymbol('RWF')).toBe('FRw')
      expect(getCurrencySymbol('USD')).toBe('$')
      expect(getCurrencySymbol('EUR')).toBe('€')
    })

    it('should return the code itself for unknown currencies', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ')
    })
  })

  describe('getEquivalentAmount', () => {
    it('should return same amount for MUR', () => {
      expect(getEquivalentAmount(499, 'MUR')).toBe(499)
    })

    it('should convert MUR to MGA', () => {
      const result = getEquivalentAmount(499, 'MGA')
      expect(result).toBeGreaterThan(499)
      expect(Number.isInteger(result)).toBe(true)
    })

    it('should convert MUR to KES', () => {
      const result = getEquivalentAmount(499, 'KES')
      expect(result).toBeGreaterThan(499)
    })

    it('should convert MUR to XOF', () => {
      const result = getEquivalentAmount(499, 'XOF')
      expect(result).toBeGreaterThan(499)
    })

    it('should return original amount for unknown currency', () => {
      expect(getEquivalentAmount(499, 'XYZ')).toBe(499)
    })

    it('should round African currencies to whole numbers', () => {
      const mga = getEquivalentAmount(499, 'MGA')
      expect(Number.isInteger(mga)).toBe(true)
      const xof = getEquivalentAmount(499, 'XOF')
      expect(Number.isInteger(xof)).toBe(true)
    })
  })
})
