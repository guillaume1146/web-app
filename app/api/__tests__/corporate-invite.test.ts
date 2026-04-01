// @vitest-environment node
/**
 * Corporate Employee Invite-by-Email API Tests
 *
 * Tests POST /api/corporate/[id]/members (invite by email)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  default: {
    corporateAdminProfile: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    corporateEmployee: { findFirst: vi.fn(), create: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({ validateRequest: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitAuth: vi.fn(() => null) }))

import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

let POST: typeof import('../corporate/[id]/members/route').POST

describe('POST /api/corporate/[id]/members — invite by email', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../corporate/[id]/members/route')
    POST = mod.POST
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)
    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'test@ex.com' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 403 when user ID does not match', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u2', userType: 'doctor', email: 'd@ex.com' })
    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'test@ex.com' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid email', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'not-an-email' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when user has no company', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue(null)
    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'test@ex.com' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 when invitee email not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue({ id: 'c1', companyName: 'TestCo' } as never)
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'nobody@ex.com' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.message).toContain('No user found')
  })

  it('returns 409 when employee already active', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue({ id: 'c1', companyName: 'TestCo' } as never)
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'inv1', firstName: 'Jane', lastName: 'D', email: 'jane@ex.com' } as never)
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue({ status: 'active' } as never)

    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'jane@ex.com' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    expect(res.status).toBe(409)
  })

  it('returns 400 when inviting yourself', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue({ id: 'c1', companyName: 'TestCo' } as never)
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'u1', firstName: 'Self', lastName: 'User', email: 'd@ex.com' } as never)
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue(null)

    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'd@ex.com' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    expect(res.status).toBe(400)
    expect((await res.json()).message).toContain('cannot invite yourself')
  })

  it('creates enrollment and notification on success', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue({ id: 'c1', companyName: 'DocClinic' } as never)
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: 'inv1', firstName: 'Jane', lastName: 'Doe', email: 'jane@ex.com' } as never)
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: 'emp1', status: 'pending', department: 'IT', joinedAt: new Date(), user: { id: 'inv1', firstName: 'Jane', lastName: 'Doe', email: 'jane@ex.com' } },
      { id: 'notif1' },
    ])

    const res = await POST(
      new NextRequest('http://localhost:3000/api/corporate/u1/members', {
        method: 'POST', body: JSON.stringify({ email: 'jane@ex.com', department: 'IT' }),
      }),
      { params: Promise.resolve({ id: 'u1' }) }
    )
    expect(res.status).toBe(201)
  })
})
