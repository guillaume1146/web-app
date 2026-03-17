import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    userSubscription: { findUnique: vi.fn() },
    subscriptionUsage: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
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
}

const makePlan = (overrides = {}) => ({
  gpConsultsPerMonth: 1,
  specialistConsultsPerMonth: 0,
  nurseConsultsPerMonth: 2,
  mentalHealthConsultsPerMonth: 1,
  nutritionConsultsPerMonth: 1,
  ambulanceFreePerMonth: 0,
  name: 'Plus',
  discounts: { lab: 10, pharmacy: 5 },
  ...overrides,
})

const makeUsage = (overrides = {}) => ({
  id: 'usage-1',
  gpConsultsUsed: 0,
  specialistConsultsUsed: 0,
  nurseConsultsUsed: 0,
  mentalHealthConsultsUsed: 0,
  nutritionConsultsUsed: 0,
  ambulanceUsed: 0,
  ...overrides,
})

describe('trackConsultationUsage — expanded types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should track nurse consultation within limit', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())
    mockPrisma.subscriptionUsage.update.mockResolvedValue({})

    const result = await trackConsultationUsage('user-1', 'nurse')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1) // 2 limit - 0 used - 1 = 1
    expect(result.message).toContain('Free nurse consultation')
  })

  it('should return full price when nurse consults used up', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage({ nurseConsultsUsed: 2 }))

    const result = await trackConsultationUsage('user-1', 'nurse')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.message).toContain('standard rate')
  })

  it('should track mental health consultation', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())
    mockPrisma.subscriptionUsage.update.mockResolvedValue({})

    const result = await trackConsultationUsage('user-1', 'mental_health')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0) // 1 limit - 0 used - 1 = 0
  })

  it('should handle ambulance not included (0 limit)', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan(),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())

    const result = await trackConsultationUsage('user-1', 'ambulance')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.message).toContain('not included')
  })

  it('should handle unlimited (-1) nurse consults', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-1', status: 'active', plan: makePlan({ nurseConsultsPerMonth: -1 }),
    })
    mockPrisma.subscriptionUsage.findUnique.mockResolvedValue(makeUsage())

    const result = await trackConsultationUsage('user-1', 'nurse')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(-1)
    expect(result.message).toContain('Unlimited')
  })

  it('should return full price for no subscription', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(null)

    const result = await trackConsultationUsage('user-1', 'gp')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.message).toContain('No active subscription')
  })
})

describe('getSubscriptionDiscount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return discount for lab services', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      status: 'active',
      plan: { discounts: { lab: 10, pharmacy: 5 }, name: 'Plus' },
    })

    const result = await getSubscriptionDiscount('user-1', 'lab')
    expect(result.discountPercent).toBe(10)
    expect(result.message).toContain('10%')
  })

  it('should return 0 for services without discount', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue({
      status: 'active',
      plan: { discounts: { lab: 10 }, name: 'Plus' },
    })

    const result = await getSubscriptionDiscount('user-1', 'specialist')
    expect(result.discountPercent).toBe(0)
  })

  it('should return 0 for no subscription', async () => {
    mockPrisma.userSubscription.findUnique.mockResolvedValue(null)

    const result = await getSubscriptionDiscount('user-1', 'lab')
    expect(result.discountPercent).toBe(0)
  })
})
