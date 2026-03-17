import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    subscriptionPlan: { findUnique: vi.fn() },
    corporateEmployee: { findMany: vi.fn() },
    userWallet: { findUnique: vi.fn(), update: vi.fn() },
    walletTransaction: { create: vi.fn() },
    userSubscription: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import prisma from '@/lib/db'
import { enrollEmployeesInPlan } from '../corporate'

const mockPrisma = prisma as unknown as {
  subscriptionPlan: { findUnique: ReturnType<typeof vi.fn> }
  corporateEmployee: { findMany: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

describe('enrollEmployeesInPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error for invalid plan', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null)

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: 'corp1',
      planId: 'bad-plan',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid corporate plan')
  })

  it('returns error for individual plan', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'p1', price: 499, name: 'Essential', type: 'individual', discounts: null,
    })

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: 'corp1',
      planId: 'p1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid corporate plan')
  })

  it('returns error when no active employees', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'p1', price: 999, name: 'Corp Premium', type: 'corporate', discounts: null,
    })
    mockPrisma.corporateEmployee.findMany.mockResolvedValue([])

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: 'corp1',
      planId: 'p1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('No active employees')
  })

  it('enrolls employees with volume discount and debits admin wallet', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'ent-mu', price: 1199, name: 'Enterprise', type: 'corporate',
      discounts: { specialist: 25, volume_50: 5, volume_100: 10 },
    })
    mockPrisma.corporateEmployee.findMany.mockResolvedValue(
      Array.from({ length: 75 }, (_, i) => ({ userId: `emp-${i}` }))
    )

    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        userWallet: {
          findUnique: vi.fn().mockResolvedValue({ id: 'w1', balance: 200000 }),
          update: vi.fn(),
        },
        walletTransaction: { create: vi.fn() },
        userSubscription: { upsert: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: 'corp1',
      planId: 'ent-mu',
    })

    expect(result.success).toBe(true)
    expect(result.enrolled).toBe(75)
    // 1199 * 0.95 = 1139.05 → 1139 per employee, 1139 * 75 = 85425
    expect(result.totalCost).toBe(1139 * 75)
  })

  it('returns INSUFFICIENT_BALANCE when wallet too low', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'p1', price: 999, name: 'Corp Premium', type: 'corporate', discounts: null,
    })
    mockPrisma.corporateEmployee.findMany.mockResolvedValue([
      { userId: 'emp-1' }, { userId: 'emp-2' },
    ])

    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        userWallet: {
          findUnique: vi.fn().mockResolvedValue({ id: 'w1', balance: 100 }), // Too low
          update: vi.fn(),
        },
        walletTransaction: { create: vi.fn() },
        userSubscription: { upsert: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: 'corp1',
      planId: 'p1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INSUFFICIENT_BALANCE')
  })

  it('returns WALLET_NOT_FOUND when admin has no wallet', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'p1', price: 999, name: 'Corp Premium', type: 'corporate', discounts: null,
    })
    mockPrisma.corporateEmployee.findMany.mockResolvedValue([{ userId: 'emp-1' }])

    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        userWallet: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
        walletTransaction: { create: vi.fn() },
        userSubscription: { upsert: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: 'corp1',
      planId: 'p1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('WALLET_NOT_FOUND')
  })
})
