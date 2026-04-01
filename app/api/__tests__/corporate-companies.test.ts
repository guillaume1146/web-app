// @vitest-environment node
/**
 * Corporate Companies API Tests
 *
 * Tests:
 * - GET /api/corporate/companies (public list)
 * - POST /api/corporate/companies (create company page)
 * - Validation, auth, duplicate prevention
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  default: {
    corporateAdminProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
  rateLimitAuth: vi.fn(() => null),
}))

import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

let GET: typeof import('../corporate/companies/route').GET
let POST: typeof import('../corporate/companies/route').POST

describe('GET /api/corporate/companies', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../corporate/companies/route')
    GET = mod.GET
    POST = mod.POST
  })

  it('returns list of companies', async () => {
    vi.mocked(prisma.corporateAdminProfile.findMany).mockResolvedValue([
      { id: 'c1', companyName: 'MediCorp', userId: 'u1', registrationNumber: null, industry: null, employeeCount: 10,  },
      { id: 'c2', companyName: 'HealthCo', userId: 'u2', registrationNumber: null, industry: null, employeeCount: 5,  },
    ])

    const req = new NextRequest('http://localhost:3000/api/corporate/companies')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(2)
  })

  it('returns empty array when no companies exist', async () => {
    vi.mocked(prisma.corporateAdminProfile.findMany).mockResolvedValue([])

    const req = new NextRequest('http://localhost:3000/api/corporate/companies')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(0)
  })
})

describe('POST /api/corporate/companies', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../corporate/companies/route')
    POST = mod.POST
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'Test Co' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when company name missing', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'doctor', email: 'd@ex.com' })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.message).toContain('Company name')
  })

  it('returns 400 when company name too short', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'doctor', email: 'd@ex.com' })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'X' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 when user already has a company', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue({
      id: 'existing', userId: 'user-1', companyName: 'Old Co',
      registrationNumber: null, industry: null, employeeCount: 0,
    })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'New Co' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.message).toContain('already have a company')
  })

  it('creates company successfully for any user type', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc-1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.corporateAdminProfile.create).mockResolvedValue({
      id: 'new-company', userId: 'doc-1', companyName: 'DocClinic Ltd',
      registrationNumber: 'BRN-123', industry: 'Healthcare', employeeCount: 10,
    })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({
        companyName: 'DocClinic Ltd',
        registrationNumber: 'BRN-123',
        industry: 'Healthcare',
        employeeCount: 10,
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.companyName).toBe('DocClinic Ltd')
  })

  it('allows patient to create company', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'pat-1', userType: 'patient', email: 'p@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.corporateAdminProfile.create).mockResolvedValue({
      id: 'pat-company', userId: 'pat-1', companyName: 'Wellness Corp',
      registrationNumber: null, industry: null, employeeCount: 0,
    })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'Wellness Corp' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('allows nurse to create company', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'nur-1', userType: 'nurse', email: 'n@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.corporateAdminProfile.create).mockResolvedValue({
      id: 'nur-company', userId: 'nur-1', companyName: 'NurseCare Ltd',
      registrationNumber: null, industry: null, employeeCount: 0,
    })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'NurseCare Ltd' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('trims whitespace from company name', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.corporateAdminProfile.create).mockResolvedValue({
      id: 'c1', userId: 'u1', companyName: 'Trimmed Co',
      registrationNumber: null, industry: null, employeeCount: 0,
    })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({ companyName: '  Trimmed Co  ' }),
    })
    await POST(req)

    expect(prisma.corporateAdminProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyName: 'Trimmed Co' }),
      })
    )
  })

  it('defaults employeeCount to 0 when not provided', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.corporateAdminProfile.create).mockResolvedValue({
      id: 'c1', userId: 'u1', companyName: 'Test',
      registrationNumber: null, industry: null, employeeCount: 0,
    })

    const req = new NextRequest('http://localhost:3000/api/corporate/companies', {
      method: 'POST',
      body: JSON.stringify({ companyName: 'Test' }),
    })
    await POST(req)

    expect(prisma.corporateAdminProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ employeeCount: 0 }),
      })
    )
  })
})
