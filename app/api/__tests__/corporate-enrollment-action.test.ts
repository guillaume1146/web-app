// @vitest-environment node
/**
 * Corporate Enrollment Accept/Decline API Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  default: {
    corporateAdminProfile: { findUnique: vi.fn() },
    corporateEmployee: { findFirst: vi.fn(), update: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/lib/auth/validate', () => ({ validateRequest: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitAuth: vi.fn(() => null) }))

import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

let POST: typeof import('../corporate/enrollment/[action]/route').POST

describe('POST /api/corporate/enrollment/[action]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../corporate/enrollment/[action]/route')
    POST = mod.POST
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)
    const res = await POST(
      new NextRequest('http://localhost/api/corporate/enrollment/accept', {
        method: 'POST', body: JSON.stringify({ companyId: 'c1' }),
      }),
      { params: Promise.resolve({ action: 'accept' }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid action', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'patient', email: 'e@x.com' })
    const res = await POST(
      new NextRequest('http://localhost/api/corporate/enrollment/invalid', {
        method: 'POST', body: JSON.stringify({ companyId: 'c1' }),
      }),
      { params: Promise.resolve({ action: 'invalid' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when company not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'patient', email: 'e@x.com' })
    vi.mocked(prisma.corporateAdminProfile.findUnique).mockResolvedValue(null)
    const res = await POST(
      new NextRequest('http://localhost/api/corporate/enrollment/accept', {
        method: 'POST', body: JSON.stringify({ companyId: 'fake' }),
      }),
      { params: Promise.resolve({ action: 'accept' }) }
    )
    expect(res.status).toBe(404)
  })

  it('returns 404 when no pending enrollment found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'patient', email: 'e@x.com' })
    vi.mocked(prisma.corporateAdminProfile.findUnique).mockResolvedValue({
      id: 'c1', userId: 'admin1', companyName: 'TestCo',
    } as never)
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue(null)

    const res = await POST(
      new NextRequest('http://localhost/api/corporate/enrollment/accept', {
        method: 'POST', body: JSON.stringify({ companyId: 'c1' }),
      }),
      { params: Promise.resolve({ action: 'accept' }) }
    )
    expect(res.status).toBe(404)
  })

  it('accepts enrollment successfully', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'emp1', userType: 'patient', email: 'emp@x.com' })
    vi.mocked(prisma.corporateAdminProfile.findUnique).mockResolvedValue({
      id: 'c1', userId: 'admin1', companyName: 'MediCorp',
    } as never)
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue({
      id: 'enr1', corporateAdminId: 'admin1', userId: 'emp1', status: 'pending',
    } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const res = await POST(
      new NextRequest('http://localhost/api/corporate/enrollment/accept', {
        method: 'POST', body: JSON.stringify({ companyId: 'c1' }),
      }),
      { params: Promise.resolve({ action: 'accept' }) }
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.action).toBe('accept')
    expect(json.data.companyName).toBe('MediCorp')
  })

  it('declines enrollment successfully', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'emp1', userType: 'patient', email: 'emp@x.com' })
    vi.mocked(prisma.corporateAdminProfile.findUnique).mockResolvedValue({
      id: 'c1', userId: 'admin1', companyName: 'MediCorp',
    } as never)
    vi.mocked(prisma.corporateEmployee.findFirst).mockResolvedValue({
      id: 'enr1', corporateAdminId: 'admin1', userId: 'emp1', status: 'pending',
    } as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}])

    const res = await POST(
      new NextRequest('http://localhost/api/corporate/enrollment/decline', {
        method: 'POST', body: JSON.stringify({ companyId: 'c1' }),
      }),
      { params: Promise.resolve({ action: 'decline' }) }
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.action).toBe('decline')
  })
})
