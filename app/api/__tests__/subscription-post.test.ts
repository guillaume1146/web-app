import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    userSubscription: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    subscriptionPlan: { findUnique: vi.fn() },
    subscriptionUsage: { findUnique: vi.fn() },
    userWallet: { findUnique: vi.fn(), update: vi.fn() },
    walletTransaction: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { POST } from '../users/[id]/subscription/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

function createReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/users/user-1/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/users/[id]/subscription', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)
    const res = await POST(createReq({ action: 'subscribe', planId: 'p1' }), mockParams('user-1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other', userType: 'patient', email: 'o@b.com' })
    const res = await POST(createReq({ action: 'subscribe', planId: 'p1' }), mockParams('user-1'))
    expect(res.status).toBe(403)
  })

  it('cancels individual subscription', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({
      id: 'sub-1', userId: 'user-1', corporateAdminId: null,
    } as never)
    vi.mocked(prisma.userSubscription.update).mockResolvedValue({} as never)

    const res = await POST(createReq({ action: 'cancel' }), mockParams('user-1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.message).toContain('cancelled')
  })

  it('blocks cancellation of corporate-sponsored subscription', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue({
      id: 'sub-1', userId: 'user-1', corporateAdminId: 'corp-admin-1',
    } as never)

    const res = await POST(createReq({ action: 'cancel' }), mockParams('user-1'))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.message).toContain('employer')
  })

  it('blocks individual subscription to corporate plan', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({
      id: 'p1', price: 399, name: 'Corp Essential', type: 'corporate',
    } as never)

    const res = await POST(createReq({ action: 'subscribe', planId: 'p1' }), mockParams('user-1'))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.message).toContain('Corporate plans')
  })

  it('subscribes to individual plan and debits wallet', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({
      id: 'p1', price: 499, name: 'Essential', type: 'individual',
    } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        userSubscription: { upsert: vi.fn() },
        userWallet: { findUnique: vi.fn().mockResolvedValue({ id: 'w1', balance: 4500 }), update: vi.fn() },
        walletTransaction: { create: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const res = await POST(createReq({ action: 'subscribe', planId: 'p1' }), mockParams('user-1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.message).toContain('Essential')
  })

  it('returns 400 for missing planId on subscribe', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })

    const res = await POST(createReq({ action: 'subscribe' }), mockParams('user-1'))
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent plan', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue(null)

    const res = await POST(createReq({ action: 'subscribe', planId: 'bad' }), mockParams('user-1'))
    expect(res.status).toBe(404)
  })

  it('returns 400 for invalid action', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.subscriptionPlan.findUnique).mockResolvedValue({
      id: 'p1', price: 499, name: 'Essential', type: 'individual',
    } as never)

    const res = await POST(createReq({ action: 'banana', planId: 'p1' }), mockParams('user-1'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when cancelling with no subscription', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null)

    const res = await POST(createReq({ action: 'cancel' }), mockParams('user-1'))
    expect(res.status).toBe(404)
  })
})
