import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    userSubscription: { findUnique: vi.fn() },
    subscriptionUsage: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { GET } from '../users/[id]/subscription/route'
import { POST } from '../users/[id]/subscription/check/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/users/[id]/subscription', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await GET(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription'),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other', userType: 'patient', email: 'o@ex.com' })

    const res = await GET(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription'),
      mockParams('user-1')
    )

    expect(res.status).toBe(403)
  })

  it('returns no subscription when none exists', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null)

    const res = await GET(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription'),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.hasSubscription).toBe(false)
  })

  it('returns subscription with usage data', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      startDate: new Date(),
      endDate: null,
      autoRenew: true,
      plan: {
        id: 'plan-1',
        name: 'Essential',
        slug: 'essential',
        type: 'individual',
        price: 250,
        currency: 'MUR',
        gpConsultsPerMonth: 1,
        specialistConsultsPerMonth: 0,
        features: ['Chat with a doctor'],
      },
    } as never)
    vi.mocked(prisma.subscriptionUsage.findUnique).mockResolvedValue({
      gpConsultsUsed: 0,
      specialistConsultsUsed: 0,
    } as never)

    const res = await GET(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription'),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.hasSubscription).toBe(true)
    expect(json.data.plan.name).toBe('Essential')
    expect(json.data.usage.gpConsultsLimit).toBe(1)
  })
})

describe('POST /api/users/[id]/subscription/check', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultType: 'gp' }),
      }),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid consultType', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultType: 'invalid' }),
      }),
      mockParams('user-1')
    )

    expect(res.status).toBe(400)
  })

  it('allows consultation when no subscription (full price)', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null)

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultType: 'gp' }),
      }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.allowed).toBe(true)
    expect(json.data.remaining).toBe(0)
  })

  it('tracks GP usage when within limit', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      plan: { gpConsultsPerMonth: 1, specialistConsultsPerMonth: 0, name: 'Essential' },
    } as never)
    vi.mocked(prisma.subscriptionUsage.findUnique).mockResolvedValue({
      id: 'usage-1',
      gpConsultsUsed: 0,
      specialistConsultsUsed: 0,
    } as never)
    vi.mocked(prisma.subscriptionUsage.update).mockResolvedValue({} as never)

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultType: 'gp' }),
      }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.allowed).toBe(true)
    expect(json.data.remaining).toBe(0) // 1 limit - 0 used - 1 tracked = 0 remaining
    expect(prisma.subscriptionUsage.update).toHaveBeenCalled()
  })

  it('allows but signals full price when over limit', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      plan: { gpConsultsPerMonth: 1, specialistConsultsPerMonth: 0, name: 'Essential' },
    } as never)
    vi.mocked(prisma.subscriptionUsage.findUnique).mockResolvedValue({
      id: 'usage-1',
      gpConsultsUsed: 1,
      specialistConsultsUsed: 0,
    } as never)

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultType: 'gp' }),
      }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.allowed).toBe(true)
    expect(json.data.remaining).toBe(0)
    expect(json.data.message).toContain('standard rate')
  })
})
