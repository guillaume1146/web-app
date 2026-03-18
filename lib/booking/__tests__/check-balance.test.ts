import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    userSubscription: { findUnique: vi.fn() },
    subscriptionUsage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userWallet: { findUnique: vi.fn() },
    providerServiceConfig: { findUnique: vi.fn() },
    platformService: { findUnique: vi.fn() },
    subscriptionPlanService: { findFirst: vi.fn() },
  },
}))

import prisma from '@/lib/db'
import { checkBookingCost, resolveServicePrice } from '../check-balance'

const mockPrisma = prisma as unknown as {
  userSubscription: { findUnique: ReturnType<typeof vi.fn> }
  subscriptionUsage: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  userWallet: { findUnique: ReturnType<typeof vi.fn> }
  providerServiceConfig: { findUnique: ReturnType<typeof vi.fn> }
  platformService: { findUnique: ReturnType<typeof vi.fn> }
  subscriptionPlanService: { findFirst: ReturnType<typeof vi.fn> }
}

describe('resolveServicePrice', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns provider override price when set', async () => {
    mockPrisma.providerServiceConfig.findUnique.mockResolvedValue({ priceOverride: 1500 })

    const result = await resolveServicePrice({
      platformServiceId: 'svc-1',
      providerUserId: 'doc-1',
    })
    expect(result.marketPrice).toBe(1500)
    expect(result.source).toBe('provider_override')
  })

  it('falls back to platform default when no override', async () => {
    mockPrisma.providerServiceConfig.findUnique.mockResolvedValue({ priceOverride: null })
    mockPrisma.platformService.findUnique.mockResolvedValue({ defaultPrice: 800 })

    const result = await resolveServicePrice({
      platformServiceId: 'svc-1',
      providerUserId: 'doc-1',
    })
    expect(result.marketPrice).toBe(800)
    expect(result.source).toBe('platform_default')
  })
})

describe('checkBookingCost', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns free when consultation is within plan quota', async () => {
    // Has active sub with GP quota
    mockPrisma.userSubscription.findUnique
      .mockResolvedValueOnce({ corporateAdminId: null, status: 'active' }) // first call: corporate check
      .mockResolvedValueOnce({ // second call: trackConsultationUsage
        id: 'sub-1', status: 'active',
        plan: { name: 'Plus', quotas: [{ role: 'DOCTOR', specialty: 'General Practice', limit: 2 }] },
      })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue({
      id: 'u1', subscriptionId: 'sub-1', month: '2026-03', usageData: {},
    })
    mockPrisma.subscriptionUsage.update.mockResolvedValue({})
    mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 5000 })

    const result = await checkBookingCost({
      patientUserId: 'user-1',
      baseFee: 800,
      provider: { role: 'DOCTOR', specialty: 'General Practice' },
    })

    expect(result.coveredBySubscription).toBe(true)
    expect(result.adjustedFee).toBe(0)
    expect(result.discountPercent).toBe(100)
  })

  it('applies discount when quota exhausted', async () => {
    // Has active sub, GP quota used up, but has specialist discount
    mockPrisma.userSubscription.findUnique
      .mockResolvedValueOnce({ corporateAdminId: null, status: 'active' }) // corporate check
      .mockResolvedValueOnce({ // trackConsultationUsage
        id: 'sub-1', status: 'active',
        plan: { name: 'Premium', quotas: [{ role: 'DOCTOR', specialty: 'General Practice', limit: 1 }] },
      })
      .mockResolvedValueOnce({ // getSubscriptionDiscount
        status: 'active',
        planId: 'plan-1',
        plan: { discounts: { specialist: 20, lab: 10 }, name: 'Premium' },
      })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue({
      id: 'u1', subscriptionId: 'sub-1', month: '2026-03', usageData: { 'DOCTOR:General Practice': 1 },
    })
    mockPrisma.subscriptionPlanService.findFirst.mockResolvedValue(null)
    mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 5000 })

    const result = await checkBookingCost({
      patientUserId: 'user-1',
      baseFee: 2000,
      provider: { role: 'DOCTOR', specialty: 'General Practice' }, // quota exhausted
      serviceType: 'specialist', // but has 20% discount
    })

    expect(result.coveredBySubscription).toBe(false)
    expect(result.discountPercent).toBe(20)
    expect(result.discount).toBe(400)
    expect(result.adjustedFee).toBe(1600)
  })

  it('returns full price when no subscription', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(null)
    mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 3000 })

    const result = await checkBookingCost({
      patientUserId: 'user-1',
      baseFee: 800,
      provider: { role: 'DOCTOR', specialty: 'General Practice' },
    })

    expect(result.coveredBySubscription).toBe(false)
    expect(result.adjustedFee).toBe(800)
    expect(result.discountPercent).toBe(0)
    expect(result.isCorporate).toBe(false)
  })

  it('identifies corporate-sponsored subscriptions', async () => {
    mockPrisma.userSubscription.findUnique
      .mockResolvedValueOnce({ corporateAdminId: 'corp-admin-1', status: 'active' })
      .mockResolvedValueOnce({
        id: 'sub-1', status: 'active',
        plan: { name: 'Corp Plus', quotas: [{ role: 'DOCTOR', specialty: 'General Practice', limit: 1 }, { role: 'NURSE', limit: 1 }] },
      })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue({
      id: 'u1', subscriptionId: 'sub-1', month: '2026-03', usageData: {},
    })
    mockPrisma.subscriptionUsage.update.mockResolvedValue({})
    mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 1000 })

    const result = await checkBookingCost({
      patientUserId: 'employee-1',
      baseFee: 800,
      provider: { role: 'DOCTOR', specialty: 'General Practice' },
    })

    expect(result.isCorporate).toBe(true)
    expect(result.coveredBySubscription).toBe(true)
    expect(result.adjustedFee).toBe(0)
  })

  it('returns insufficient when wallet balance too low for discounted price', async () => {
    mockPrisma.userSubscription.findUnique
      .mockResolvedValueOnce({ corporateAdminId: null, status: 'active' })
      .mockResolvedValueOnce({
        id: 'sub-1', status: 'active',
        plan: { name: 'Essential', quotas: [] },
      })
      .mockResolvedValueOnce({
        status: 'active',
        planId: 'plan-1',
        plan: { discounts: { lab: 15 }, name: 'Essential' },
      })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue({
      id: 'u1', subscriptionId: 'sub-1', month: '2026-03', usageData: {},
    })
    mockPrisma.subscriptionPlanService.findFirst.mockResolvedValue(null)
    mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 100 })

    const result = await checkBookingCost({
      patientUserId: 'user-1',
      baseFee: 500,
      provider: { role: 'DOCTOR', specialty: 'General Practice' },
      serviceType: 'lab',
    })

    // 500 * 15% = 75 discount → pays 425
    expect(result.adjustedFee).toBe(425)
    expect(result.sufficient).toBe(false)
    expect(result.balance).toBe(100)
  })
})
