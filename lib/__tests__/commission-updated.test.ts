import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {
    platformConfig: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    regionalAdminProfile: { findFirst: vi.fn() },
  },
}))

import prisma from '@/lib/db'
import { calculateCommission } from '../commission'

const mockPrisma = prisma as unknown as {
  platformConfig: { findFirst: ReturnType<typeof vi.fn> }
  user: { findUnique: ReturnType<typeof vi.fn> }
  regionalAdminProfile: { findFirst: ReturnType<typeof vi.fn> }
}

describe('Commission model (15% platform)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should split 15% platform / 85% provider with no regional commission', async () => {
    mockPrisma.platformConfig.findFirst.mockResolvedValue({
      platformCommissionRate: 15,
      regionalCommissionRate: 0,
      providerCommissionRate: 85,
    })
    mockPrisma.user.findUnique.mockResolvedValue({ address: 'Port Louis' })
    mockPrisma.regionalAdminProfile.findFirst.mockResolvedValue({ id: 'RAPROF001', userId: 'RADM001' })

    const result = await calculateCommission(1000, 'DOC001')

    expect(result.platformCommission).toBe(150)
    expect(result.regionalCommission).toBe(0)
    expect(result.providerAmount).toBe(850)
    expect(result.regionalAdminId).toBe('RADM001')
  })

  it('should handle no PlatformConfig — use env defaults', async () => {
    mockPrisma.platformConfig.findFirst.mockResolvedValue(null)
    mockPrisma.user.findUnique.mockResolvedValue({ address: 'Nairobi' })
    mockPrisma.regionalAdminProfile.findFirst.mockResolvedValue(null)

    const result = await calculateCommission(1000, 'DOC002')

    // Default env: 15% platform, 0% regional, 85% provider
    expect(result.platformCommission).toBe(150)
    expect(result.regionalCommission).toBe(0)
    expect(result.providerAmount).toBe(850)
    expect(result.regionalAdminId).toBeNull()
  })

  it('should round commission amounts to 2 decimal places', async () => {
    mockPrisma.platformConfig.findFirst.mockResolvedValue({
      platformCommissionRate: 15,
      regionalCommissionRate: 0,
      providerCommissionRate: 85,
    })
    mockPrisma.user.findUnique.mockResolvedValue({ address: 'Test' })
    mockPrisma.regionalAdminProfile.findFirst.mockResolvedValue({ id: 'RA1', userId: 'U1' })

    const result = await calculateCommission(333, 'DOC001')

    // 333 * 0.15 = 49.95, 333 * 0.85 = 283.05
    expect(result.platformCommission).toBe(49.95)
    expect(result.providerAmount).toBe(283.05)
  })
})
