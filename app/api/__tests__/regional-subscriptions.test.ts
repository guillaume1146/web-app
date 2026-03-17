import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    regionalAdminProfile: { findFirst: vi.fn() },
    subscriptionPlan: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    subscriptionPlanService: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { GET, POST } from '../regional/subscriptions/route'
import { GET as getOne, PATCH, DELETE as deletePlan } from '../regional/subscriptions/[id]/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

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

describe('GET /api/regional/subscriptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await GET(createReq('/api/regional/subscriptions'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when no regional admin profile', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue(null)
    const res = await GET(createReq('/api/regional/subscriptions'))
    expect(res.status).toBe(403)
  })

  it('returns plans for the admin region', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findMany).mockResolvedValue([
      { id: '1', name: 'Essential', countryCode: 'MU' },
    ] as never)

    const res = await GET(createReq('/api/regional/subscriptions'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })
})

describe('POST /api/regional/subscriptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await POST(createReq('/api/regional/subscriptions', 'POST', { name: 'Test' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)

    const res = await POST(createReq('/api/regional/subscriptions', 'POST', { name: '' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('creates a plan with services', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue(null) // no duplicate slug

    const created = { id: 'plan-new', name: 'TestPlan', slug: 'testplan-mu' }
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        subscriptionPlan: { create: vi.fn().mockResolvedValue(created) },
        subscriptionPlanService: { createMany: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const res = await POST(createReq('/api/regional/subscriptions', 'POST', {
      name: 'TestPlan',
      type: 'individual',
      price: 500,
      currency: 'MUR',
      gpConsultsPerMonth: 2,
      specialistConsultsPerMonth: 0,
      features: ['2 GP consults/month'],
      services: [{ platformServiceId: 'svc-1', isFree: true, monthlyLimit: 2 }],
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('TestPlan')
  })

  it('returns 409 for duplicate slug', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({ id: 'existing' } as never)

    const res = await POST(createReq('/api/regional/subscriptions', 'POST', {
      name: 'TestPlan',
      type: 'individual',
      price: 500,
      currency: 'MUR',
      gpConsultsPerMonth: 1,
      specialistConsultsPerMonth: 0,
      features: ['Feature'],
    }))
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/regional/subscriptions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await PATCH(createReq('/api/regional/subscriptions/p1', 'PATCH', { price: 600 }), mockParams('p1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for plans from other regions', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({ id: 'p1', countryCode: 'KE' } as never)

    const res = await PATCH(createReq('/api/regional/subscriptions/p1', 'PATCH', { price: 600 }), mockParams('p1'))
    expect(res.status).toBe(403)
  })

  it('updates plan successfully', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({ id: 'p1', countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.update).mockResolvedValue({ id: 'p1', price: 600 } as never)

    const res = await PATCH(createReq('/api/regional/subscriptions/p1', 'PATCH', { price: 600 }), mockParams('p1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 404 for non-existent plan', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue(null)

    const res = await PATCH(createReq('/api/regional/subscriptions/bad', 'PATCH', { price: 600 }), mockParams('bad'))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/regional/subscriptions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('soft-deletes plan by setting isActive=false', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({ id: 'p1', countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.update).mockResolvedValue({ id: 'p1', isActive: false } as never)

    const res = await deletePlan(createReq('/api/regional/subscriptions/p1', 'DELETE'), mockParams('p1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 403 for plans from other regions', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({ id: 'p1', countryCode: 'KE' } as never)

    const res = await deletePlan(createReq('/api/regional/subscriptions/p1', 'DELETE'), mockParams('p1'))
    expect(res.status).toBe(403)
  })
})
