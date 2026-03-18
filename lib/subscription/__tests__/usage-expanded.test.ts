import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    userSubscription: { findUnique: vi.fn() },
    subscriptionUsage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscriptionPlanService: { findFirst: vi.fn() },
  },
}))

import prisma from '@/lib/db'
import { trackConsultationUsage, getSubscriptionDiscount } from '../usage'

const mockPrisma = prisma as unknown as {
  userSubscription: { findUnique: ReturnType<typeof vi.fn> }
  subscriptionUsage: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  subscriptionPlanService: { findFirst: ReturnType<typeof vi.fn> }
}

const makePlan = (overrides = {}) => ({
  name: 'Plus',
  quotas: [
    { role: 'DOCTOR', specialty: 'General Practice', limit: 1 },
    { role: 'NURSE', limit: 2 },
    { role: 'DOCTOR', specialty: 'Psychiatry', limit: 1 },
    { role: 'EMERGENCY_WORKER', limit: 0 },
  ],
  discounts: { lab: 10, pharmacy: 5 },
  ...overrides,
})

const makeUsage = (overrides = {}) => ({
  id: 'usage-1',
  usageData: {},
  ...overrides,
})

describe('trackConsultationUsage — flexible quotas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tracks nurse consultation within limit', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())
    mockPrisma.subscriptionUsage.update.mockResolvedValue({})

    const result = await trackConsultationUsage('user-1', { role: 'NURSE' })
    expect(result.allowed).toBe(true)
    expect(result.covered).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('returns full price when nurse quota exhausted', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage({ usageData: { NURSE: 2 } }))

    const result = await trackConsultationUsage('user-1', { role: 'NURSE' })
    expect(result.covered).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('tracks doctor specialty consultation', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())
    mockPrisma.subscriptionUsage.update.mockResolvedValue({})

    const result = await trackConsultationUsage('user-1', { role: 'DOCTOR', specialty: 'Psychiatry' })
    expect(result.covered).toBe(true)
    expect(result.remaining).toBe(0) // 1 limit - 0 used - 1 = 0
  })

  it('handles role not included (0 limit)', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())

    const result = await trackConsultationUsage('user-1', { role: 'EMERGENCY_WORKER' })
    expect(result.covered).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('handles unlimited (-1) quota', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan({
        quotas: [{ role: 'NURSE', limit: -1 }],
      }),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())

    const result = await trackConsultationUsage('user-1', { role: 'NURSE' })
    expect(result.covered).toBe(true)
    expect(result.remaining).toBe(-1)
  })

  it('returns full price for no subscription', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(null)

    const result = await trackConsultationUsage('user-1', { role: 'DOCTOR', specialty: 'General Practice' })
    expect(result.covered).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('handles new role (CAREGIVER) in quotas', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan({
        quotas: [{ role: 'CAREGIVER', limit: 3 }],
      }),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())
    mockPrisma.subscriptionUsage.update.mockResolvedValue({})

    const result = await trackConsultationUsage('user-1', { role: 'CAREGIVER' })
    expect(result.covered).toBe(true)
    expect(result.remaining).toBe(2)
  })
})

describe('getSubscriptionDiscount — flexible', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns discount for service type', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      status: 'active', planId: 'p1',
      plan: { discounts: { lab: 10, pharmacy: 5 }, name: 'Plus' },
    })
    mockPrisma.subscriptionPlanService.findFirst.mockResolvedValue(null)

    const result = await getSubscriptionDiscount('user-1', 'lab')
    expect(result.discountPercent).toBe(10)
  })

  it('returns discount for role:specialty key', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      status: 'active', planId: 'p1',
      plan: { discounts: { 'DOCTOR:Cardiology': 20 }, name: 'Premium' },
    })
    mockPrisma.subscriptionPlanService.findFirst.mockResolvedValue(null)

    const result = await getSubscriptionDiscount('user-1', 'specialist', undefined, { role: 'DOCTOR', specialty: 'Cardiology' })
    expect(result.discountPercent).toBe(20)
  })

  it('returns 0 for no subscription', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(null)

    const result = await getSubscriptionDiscount('user-1', 'lab')
    expect(result.discountPercent).toBe(0)
  })
})
