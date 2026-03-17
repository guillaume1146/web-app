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
  rateLimitPublic: vi.fn(() => null),
}))

import { POST } from '../users/[id]/wallet/reset/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

function createReq(body?: Record<string, unknown>) {
  if (body) {
    return new NextRequest('http://localhost:3000/api/users/user-1/wallet/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return new NextRequest('http://localhost:3000/api/users/user-1/wallet/reset', { method: 'POST' })
}

describe('POST /api/users/[id]/wallet/reset', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)
    const res = await POST(createReq(), mockParams('user-1'))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other', userType: 'patient', email: 'o@b.com' })
    const res = await POST(createReq(), mockParams('user-1'))
    expect(res.status).toBe(403)
  })

  it('returns 404 when wallet not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.userWallet.findUnique).mockResolvedValue(null)

    const res = await POST(createReq(), mockParams('user-1'))
    expect(res.status).toBe(404)
  })

  it('resets to initialCredit without custom amount', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.userWallet.findUnique).mockResolvedValue({
      id: 'w1', balance: 1000, initialCredit: 4500,
    } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { balance: 4500, initialCredit: 4500 },
      {},
    ] as never)

    const res = await POST(createReq(), mockParams('user-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.balance).toBe(4500)
  })

  it('resets to custom amount and updates initialCredit', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'corporate', email: 'u@b.com' })
    vi.mocked(prisma.userWallet.findUnique).mockResolvedValue({
      id: 'w1', balance: 500, initialCredit: 4500,
    } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { balance: 500000, initialCredit: 500000 },
      {},
    ] as never)

    const res = await POST(createReq({ amount: 500000 }), mockParams('user-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.balance).toBe(500000)
    expect(json.data.initialCredit).toBe(500000)
  })

  it('handles infinite resets (no restriction)', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'u@b.com' })
    vi.mocked(prisma.userWallet.findUnique).mockResolvedValue({
      id: 'w1', balance: 4500, initialCredit: 4500, // already at max
    } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { balance: 4500, initialCredit: 4500 },
      {},
    ] as never)

    const res = await POST(createReq(), mockParams('user-1'))
    expect(res.status).toBe(200) // No restriction — always works
  })
})
