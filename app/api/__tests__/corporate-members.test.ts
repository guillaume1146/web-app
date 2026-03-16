import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    corporateEmployee: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: { update: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { GET, PATCH } from '../corporate/[id]/members/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

function createRequest(url: string, method: string, body?: unknown) {
  const init: { method: string; headers?: Record<string, string>; body?: string } = { method }
  if (body) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  return new NextRequest(`http://localhost:3000${url}`, init)
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/corporate/[id]/members', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await GET(
      createRequest('/api/corporate/user-1/members', 'GET'),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other-user', userType: 'corporate', email: 'o@ex.com' })

    const res = await GET(
      createRequest('/api/corporate/user-1/members', 'GET'),
      mockParams('user-1')
    )

    expect(res.status).toBe(403)
  })

  it('returns members list', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'corporate', email: 'c@ex.com' })

    const members = [
      {
        id: 'ce-1',
        status: 'active',
        department: null,
        joinedAt: new Date(),
        approvedAt: new Date(),
        removedAt: null,
        user: { id: 'u-1', firstName: 'John', lastName: 'Doe', email: 'john@ex.com', phone: '+230 5555', profileImage: null, accountStatus: 'active' },
      },
    ]
    vi.mocked(prisma.corporateEmployee.findMany).mockResolvedValue(members as never)

    const res = await GET(
      createRequest('/api/corporate/user-1/members', 'GET'),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })
})

describe('PATCH /api/corporate/[id]/members', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await PATCH(
      createRequest('/api/corporate/user-1/members', 'PATCH', { memberId: 'ce-1', action: 'approve' }),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 400 for missing fields', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'corporate', email: 'c@ex.com' })

    const res = await PATCH(
      createRequest('/api/corporate/user-1/members', 'PATCH', {}),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 404 for non-existent member', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'corporate', email: 'c@ex.com' })
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue(null)

    const res = await PATCH(
      createRequest('/api/corporate/user-1/members', 'PATCH', { memberId: 'fake', action: 'approve' }),
      mockParams('user-1')
    )

    expect(res.status).toBe(404)
  })

  it('approves pending member', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'corporate', email: 'c@ex.com' })
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue({
      id: 'ce-1', userId: 'u-2', user: { firstName: 'Jane', lastName: 'Doe' },
    } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never)

    const res = await PATCH(
      createRequest('/api/corporate/user-1/members', 'PATCH', { memberId: 'ce-1', action: 'approve' }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.action).toBe('approve')
  })

  it('rejects pending member', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'corporate', email: 'c@ex.com' })
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue({
      id: 'ce-1', userId: 'u-2', user: { firstName: 'Jane', lastName: 'Doe' },
    } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never)

    const res = await PATCH(
      createRequest('/api/corporate/user-1/members', 'PATCH', { memberId: 'ce-1', action: 'reject' }),
      mockParams('user-1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.action).toBe('reject')
  })
})
