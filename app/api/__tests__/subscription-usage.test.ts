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

vi.mock('@/lib/subscription/usage', () => ({
  getUsageSummary: vi.fn(),
  trackConsultationUsage: vi.fn(),
}))

import { GET } from '../users/[id]/subscription/route'
import { POST } from '../users/[id]/subscription/check/route'
import { validateRequest } from '@/lib/auth/validate'
import { getUsageSummary, trackConsultationUsage } from '@/lib/subscription/usage'
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
    vi.mocked(getUsageSummary).mockResolvedValue({
      hasSubscription: false,
      plan: null,
      usage: null,
    })

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
    vi.mocked(getUsageSummary).mockResolvedValue({
      hasSubscription: true,
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
        quotas: [{ role: 'DOCTOR', specialty: 'General Practice', limit: 1 }],
        discounts: null,
        features: ['Chat with a doctor'],
      },
      usage: {
        month: '2026-03',
        quotas: [
          { key: 'DOCTOR:General Practice', label: 'General Practice', used: 0, limit: 1 },
        ],
      },
    })

    const res = await GET(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription'),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.hasSubscription).toBe(true)
    expect(json.data.plan.name).toBe('Essential')
    expect(json.data.usage.quotas[0].limit).toBe(1)
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
        body: JSON.stringify({ role: 'DOCTOR', specialty: 'General Practice' }),
      }),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid body (missing role)', async () => {
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
    vi.mocked(trackConsultationUsage).mockResolvedValue({
      allowed: true,
      remaining: 0,
      covered: false,
      message: 'No active subscription — full price applies.',
    })

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'DOCTOR', specialty: 'General Practice' }),
      }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.allowed).toBe(true)
    expect(json.data.remaining).toBe(0)
  })

  it('tracks usage when within limit', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(trackConsultationUsage).mockResolvedValue({
      allowed: true,
      remaining: 0,
      covered: true,
      message: 'Free General Practice consultation (0 remaining this month).',
    })

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'DOCTOR', specialty: 'General Practice' }),
      }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.allowed).toBe(true)
    expect(json.data.remaining).toBe(0)
  })

  it('allows but signals standard rate when over limit', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(trackConsultationUsage).mockResolvedValue({
      allowed: true,
      remaining: 0,
      covered: false,
      message: 'Monthly General Practice consultations used — standard rate applies.',
    })

    const res = await POST(
      new NextRequest('http://localhost:3000/api/users/user-1/subscription/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'DOCTOR', specialty: 'General Practice' }),
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
