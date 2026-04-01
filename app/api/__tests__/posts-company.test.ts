// @vitest-environment node
/**
 * Posts API — Post as Company Tests
 *
 * Tests:
 * - Any verified user can create posts (not just doctors)
 * - Posts can be created as a company (LinkedIn-style)
 * - Company ownership validation
 * - Feed returns company info on posts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  default: {
    user: { findUnique: vi.fn() },
    doctorPost: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    corporateAdminProfile: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

vi.mock('@/lib/validations/api', () => ({
  createPostSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.content || typeof data.content !== 'string' || data.content.trim().length < 1) {
        return { success: false, error: { issues: [{ message: 'Content is required' }] } }
      }
      return { success: true, data }
    }),
  },
}))

import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

let GET: typeof import('../posts/route').GET
let POST: typeof import('../posts/route').POST

describe('POST /api/posts — any verified user', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../posts/route')
    GET = mod.GET
    POST = mod.POST
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 for unverified user', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      userType: 'DOCTOR', verified: false,
    } as never)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('allows verified doctor to create post', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      userType: 'DOCTOR', verified: true,
    } as never)
    vi.mocked(prisma.doctorPost.create).mockResolvedValue({
      id: 'post-1', content: 'Health tip', authorId: 'doc1', companyId: null,
    } as never)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Health tip' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('allows verified nurse to create post', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'nur1', userType: 'nurse', email: 'n@ex.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      userType: 'NURSE', verified: true,
    } as never)
    vi.mocked(prisma.doctorPost.create).mockResolvedValue({
      id: 'post-2', content: 'Nursing tip', authorId: 'nur1', companyId: null,
    } as never)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Nursing tip' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('allows verified patient to create post', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'pat1', userType: 'patient', email: 'p@ex.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      userType: 'PATIENT', verified: true,
    } as never)
    vi.mocked(prisma.doctorPost.create).mockResolvedValue({
      id: 'post-3', content: 'Patient story', authorId: 'pat1', companyId: null,
    } as never)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Patient story' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe('POST /api/posts — post as company', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../posts/route')
    POST = mod.POST
  })

  it('creates post with companyId when user owns the company', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      userType: 'DOCTOR', verified: true,
    } as never)
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue({
      id: 'comp-1', userId: 'doc1', companyName: 'DocClinic',
    } as never)
    vi.mocked(prisma.doctorPost.create).mockResolvedValue({
      id: 'post-4', content: 'Company update', authorId: 'doc1', companyId: 'comp-1',
      company: { id: 'comp-1', companyName: 'DocClinic' },
    } as never)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Company update', companyId: 'comp-1' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.companyId).toBe('comp-1')
  })

  it('returns 403 when user does not own the company', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      userType: 'DOCTOR', verified: true,
    } as never)
    // Company not found for this user
    vi.mocked(prisma.corporateAdminProfile.findFirst).mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Fake company post', companyId: 'someone-elses-company' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.message).toContain('do not own')
  })

  it('creates personal post when no companyId provided', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'doc1', userType: 'doctor', email: 'd@ex.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      userType: 'DOCTOR', verified: true,
    } as never)
    vi.mocked(prisma.doctorPost.create).mockResolvedValue({
      id: 'post-5', content: 'Personal post', authorId: 'doc1', companyId: null,
    } as never)

    const req = new NextRequest('http://localhost:3000/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content: 'Personal post' }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.companyId).toBeNull()
  })
})

describe('GET /api/posts — feed includes company info', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../posts/route')
    GET = mod.GET
  })

  it('returns posts with company data when present', async () => {
    vi.mocked(prisma.doctorPost.findMany).mockResolvedValue([
      {
        id: 'p1', content: 'Company post', companyId: 'c1',
        author: { id: 'u1', firstName: 'John', lastName: 'Doe', userType: 'DOCTOR', verified: true, profileImage: null, doctorProfile: null },
        company: { id: 'c1', companyName: 'HealthCorp' },
        _count: { comments: 0 },
      },
      {
        id: 'p2', content: 'Personal post', companyId: null,
        author: { id: 'u2', firstName: 'Jane', lastName: 'Smith', userType: 'NURSE', verified: true, profileImage: null, doctorProfile: null },
        company: null,
        _count: { comments: 2 },
      },
    ] as never)
    vi.mocked(prisma.doctorPost.count).mockResolvedValue(2)

    const req = new NextRequest('http://localhost:3000/api/posts')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.posts).toHaveLength(2)
    expect(json.data.posts[0].company?.companyName).toBe('HealthCorp')
    expect(json.data.posts[1].company).toBeNull()
  })
})
