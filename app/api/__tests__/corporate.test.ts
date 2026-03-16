import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    corporateAdminProfile: { findUnique: vi.fn() },
    corporateEmployee: { findMany: vi.fn() },
    userWallet: { findUnique: vi.fn() },
    billingInfo: { findMany: vi.fn() },
    walletTransaction: { findMany: vi.fn() },
    notification: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    insuranceClaim: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
  rateLimitAuth: vi.fn(() => null),
}))

import { GET as getCorporateDashboard } from '../corporate/[id]/dashboard/route'
import { GET as getCorporateEmployees } from '../corporate/[id]/employees/route'
import { GET as getCorporateClaims } from '../corporate/[id]/claims/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

function createGetRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`, { method: 'GET' })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/corporate/[id]/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await getCorporateDashboard(
      createGetRequest('/api/corporate/user-1/dashboard'),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other-user', userType: 'corporate', email: 'o@ex.com' })

    const res = await getCorporateDashboard(
      createGetRequest('/api/corporate/user-1/dashboard'),
      mockParams('user-1')
    )

    expect(res.status).toBe(403)
  })

  it('returns 200 with stats for owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'corp-1', userType: 'corporate', email: 'c@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findUnique).mockResolvedValue({
      id: 'cp-1', companyName: 'TestCorp', employeeCount: 50, industry: 'Health', registrationNumber: 'REG-1',
    } as never)
    vi.mocked(prisma.userWallet.findUnique).mockResolvedValue({ balance: 4500 } as never)
    vi.mocked(prisma.billingInfo.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.walletTransaction.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([] as never)

    const res = await getCorporateDashboard(
      createGetRequest('/api/corporate/corp-1/dashboard'),
      mockParams('corp-1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.stats.companyName).toBe('TestCorp')
    expect(data.data.stats.totalEmployees).toBe(50)
    expect(data.data.stats.walletBalance).toBe(4500)
  })

  it('returns 404 when profile not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'corp-1', userType: 'corporate', email: 'c@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.userWallet.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.billingInfo.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.walletTransaction.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([] as never)

    const res = await getCorporateDashboard(
      createGetRequest('/api/corporate/corp-1/dashboard'),
      mockParams('corp-1')
    )

    expect(res.status).toBe(404)
  })
})

describe('GET /api/corporate/[id]/employees', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await getCorporateEmployees(
      createGetRequest('/api/corporate/user-1/employees'),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-owner', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'other-user', userType: 'corporate', email: 'o@ex.com' })

    const res = await getCorporateEmployees(
      createGetRequest('/api/corporate/user-1/employees'),
      mockParams('user-1')
    )

    expect(res.status).toBe(403)
  })

  it('returns 200 with employee list', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'corp-1', userType: 'corporate', email: 'c@ex.com' })
    vi.mocked(prisma.corporateEmployee.findMany).mockResolvedValue([
      {
        id: 'ce-1',
        department: null,
        joinedAt: new Date('2026-01-01'),
        approvedAt: new Date('2026-01-02'),
        user: { id: 'emp-1', firstName: 'Test', lastName: 'Employee', email: 'e@ex.com', phone: '+230 5555', profileImage: null, accountStatus: 'active', createdAt: new Date() },
      },
    ] as never)

    const res = await getCorporateEmployees(
      createGetRequest('/api/corporate/corp-1/employees'),
      mockParams('corp-1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(data.data[0].name).toBe('Test Employee')
  })
})

describe('GET /api/corporate/[id]/claims', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const res = await getCorporateClaims(
      createGetRequest('/api/corporate/user-1/claims'),
      mockParams('user-1')
    )

    expect(res.status).toBe(401)
  })

  it('returns 200 with claims', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'corp-1', userType: 'corporate', email: 'c@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findUnique).mockResolvedValue({ id: 'cp-1', companyName: 'TestCorp' } as never)
    vi.mocked(prisma.insuranceClaim.findMany).mockResolvedValue([] as never)

    const res = await getCorporateClaims(
      createGetRequest('/api/corporate/corp-1/claims'),
      mockParams('corp-1')
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })
})
