import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    user: { findUnique: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
    corporateEmployee: { findMany: vi.fn(), count: vi.fn() },
    userWallet: { findUnique: vi.fn(), update: vi.fn() },
    walletTransaction: { create: vi.fn() },
    userSubscription: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

// Must mock corporate module since it imports prisma
vi.mock('@/lib/subscription/corporate', async () => {
  const actual = await vi.importActual<typeof import('@/lib/subscription/corporate')>('@/lib/subscription/corporate')
  return {
    ...actual,
    enrollEmployeesInPlan: vi.fn(),
    calculateCorporatePlanCost: actual.calculateCorporatePlanCost,
  }
})

import { GET, POST } from '../corporate/enroll/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { enrollEmployeesInPlan } from '@/lib/subscription/corporate'
import { NextRequest } from 'next/server'

function createReq(url: string, method = 'GET', body?: Record<string, unknown>) {
  if (body) {
    return new NextRequest(`http://localhost:3000${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return new NextRequest(`http://localhost:3000${url}`, { method })
}

describe('POST /api/corporate/enroll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await POST(createReq('/api/corporate/enroll', 'POST', { planId: 'p1' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-corporate users', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'PATIENT' } as never)

    const res = await POST(createReq('/api/corporate/enroll', 'POST', { planId: 'p1' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for missing planId', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'corp1', userType: 'corporate', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'CORPORATE_ADMIN' } as never)

    const res = await POST(createReq('/api/corporate/enroll', 'POST', {}))
    expect(res.status).toBe(400)
  })

  it('enrolls employees successfully', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'corp1', userType: 'corporate', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'CORPORATE_ADMIN' } as never)
    vi.mocked(enrollEmployeesInPlan).mockResolvedValue({ success: true, enrolled: 50, totalCost: 56950 })

    const res = await POST(createReq('/api/corporate/enroll', 'POST', { planId: 'ent-mu' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.enrolled).toBe(50)
    expect(json.data.totalCost).toBe(56950)
  })

  it('returns 402 for insufficient balance', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'corp1', userType: 'corporate', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'CORPORATE_ADMIN' } as never)
    vi.mocked(enrollEmployeesInPlan).mockResolvedValue({ success: false, enrolled: 0, totalCost: 0, error: 'INSUFFICIENT_BALANCE' })

    const res = await POST(createReq('/api/corporate/enroll', 'POST', { planId: 'ent-mu' }))
    expect(res.status).toBe(402)
  })

  it('returns 400 for no active employees', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'corp1', userType: 'corporate', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ userType: 'CORPORATE_ADMIN' } as never)
    vi.mocked(enrollEmployeesInPlan).mockResolvedValue({ success: false, enrolled: 0, totalCost: 0, error: 'No active employees' })

    const res = await POST(createReq('/api/corporate/enroll', 'POST', { planId: 'ent-mu' }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/corporate/enroll — preview cost', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await GET(createReq('/api/corporate/enroll?planId=p1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 without planId query', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'corp1', userType: 'corporate', email: 'a@b.com' })
    const res = await GET(createReq('/api/corporate/enroll'))
    expect(res.status).toBe(400)
  })

  it('returns cost preview with volume discount', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'corp1', userType: 'corporate', email: 'a@b.com' })
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({
      price: 1199, name: 'Enterprise', discounts: { volume_50: 5, volume_100: 10 },
    } as never)
    vi.mocked(prisma.corporateEmployee.count).mockResolvedValue(75)

    const res = await GET(createReq('/api/corporate/enroll?planId=ent-mu'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.employeeCount).toBe(75)
    expect(json.data.volumeDiscountPercent).toBe(5)
    expect(json.data.discountedPricePerEmployee).toBe(1139) // 1199 * 0.95
    expect(json.data.totalMonthly).toBe(1139 * 75)
  })

  it('returns 404 for non-existent plan', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'corp1', userType: 'corporate', email: 'a@b.com' })
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue(null)

    const res = await GET(createReq('/api/corporate/enroll?planId=bad'))
    expect(res.status).toBe(404)
  })
})
