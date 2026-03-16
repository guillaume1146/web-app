import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
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

import { POST } from '../users/[id]/wallet/topup/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

function createRequest(url: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('POST /api/users/[id]/wallet/topup', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await POST(
      createRequest('/api/users/user-1/wallet/topup', { amount: 500 }),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other-user', userType: 'patient', email: 'o@ex.com' })

    const res = await POST(
      createRequest('/api/users/user-1/wallet/topup', { amount: 500 }),
      mockParams('user-1')
    )

    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid amount', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })

    const res = await POST(
      createRequest('/api/users/user-1/wallet/topup', { amount: -100 }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 for amount exceeding max', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })

    const res = await POST(
      createRequest('/api/users/user-1/wallet/topup', { amount: 100000 }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('successfully tops up wallet', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        userWallet: {
          findUnique: vi.fn().mockResolvedValue({ id: 'w-1', balance: 1000 }),
          update: vi.fn(),
        },
        walletTransaction: { create: vi.fn() },
      }
      return (fn as (tx: Record<string, unknown>) => Promise<unknown>)(tx)
    })

    const res = await POST(
      createRequest('/api/users/user-1/wallet/topup', { amount: 500, paymentMethod: 'mcb_juice' }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.newBalance).toBe(1500)
  })

  it('returns 404 when wallet not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@ex.com' })
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        userWallet: { findUnique: vi.fn().mockResolvedValue(null) },
      }
      return (fn as (tx: Record<string, unknown>) => Promise<unknown>)(tx)
    })

    const res = await POST(
      createRequest('/api/users/user-1/wallet/topup', { amount: 500 }),
      mockParams('user-1')
    )

    expect(res.status).toBe(404)
  })
})
