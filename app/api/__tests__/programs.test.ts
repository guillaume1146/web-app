import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    healthProgram: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    programSession: { createMany: vi.fn() },
    programProvider: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    programEnrollment: { findUnique: vi.fn(), create: vi.fn() },
    programSessionProgress: { createMany: vi.fn() },
    user: { findUnique: vi.fn() },
    region: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({ validateRequest: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
  rateLimitAuth: vi.fn(() => null),
}))

import { GET, POST } from '../programs/route'
import { POST as enrollPost } from '../programs/[id]/enroll/route'
import { POST as addProviderPost } from '../programs/[id]/providers/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

function createReq(url: string, method = 'GET', body?: Record<string, unknown>) {
  if (body) {
    return new NextRequest(`http://localhost:3000${url}`, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
  }
  return new NextRequest(`http://localhost:3000${url}`, { method })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/programs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns active programs', async () => {
    vi.mocked(prisma.healthProgram.findMany).mockResolvedValue([
      { id: 'prog-1', name: 'Diabetes Program', sessions: [], providers: [], _count: { enrollments: 5 } },
    ] as never)

    const res = await GET(createReq('/api/programs'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
  })
})

describe('POST /api/programs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await POST(createReq('/api/programs', 'POST', { name: 'Test' }))
    expect(res.status).toBe(401)
  })

  it('creates program with sessions', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc-1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ regionId: 'REG-MU' } as never)
    vi.mocked(prisma.region.findUnique).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        healthProgram: { create: vi.fn().mockResolvedValue({ id: 'prog-new', name: 'Test Program' }) },
        programSession: { createMany: vi.fn() },
        programProvider: { create: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const res = await POST(createReq('/api/programs', 'POST', {
      name: 'Diabetes Management',
      description: '12 week diabetes program',
      providerType: 'DOCTOR',
      specialty: 'Endocrinology',
      durationWeeks: 12,
      price: 5000,
      sessions: [
        { weekNumber: 1, serviceName: 'Initial Assessment', duration: 60 },
        { weekNumber: 4, serviceName: 'Follow-up', duration: 30 },
        { weekNumber: 12, serviceName: 'Final Review', duration: 60 },
      ],
    }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
  })

  it('returns 400 for missing sessions', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc-1', userType: 'doctor', email: 'a@b.com' })
    const res = await POST(createReq('/api/programs', 'POST', {
      name: 'Test', description: 'desc', providerType: 'DOCTOR',
      durationWeeks: 4, price: 1000, sessions: [],
    }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/programs/[id]/enroll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('enrolls patient in program', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'pat-1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.healthProgram.findUnique).mockResolvedValue({
      id: 'prog-1', name: 'Test', isActive: true, maxParticipants: 20,
      sessions: [{ id: 's1' }, { id: 's2' }], _count: { enrollments: 5 },
    } as never)
    vi.mocked(prisma.programEnrollment.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        programEnrollment: { create: vi.fn().mockResolvedValue({ id: 'enr-1', status: 'enrolled' }) },
        programSessionProgress: { createMany: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const res = await enrollPost(createReq('/api/programs/prog-1/enroll', 'POST'), mockParams('prog-1'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 409 if already enrolled', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'pat-1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.healthProgram.findUnique).mockResolvedValue({
      id: 'prog-1', isActive: true, sessions: [], _count: { enrollments: 1 },
    } as never)
    vi.mocked(prisma.programEnrollment.findUnique).mockResolvedValue({ id: 'existing' } as never)

    const res = await enrollPost(createReq('/api/programs/prog-1/enroll', 'POST'), mockParams('prog-1'))
    expect(res.status).toBe(409)
  })

  it('returns 400 if program is full', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'pat-1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.healthProgram.findUnique).mockResolvedValue({
      id: 'prog-1', isActive: true, maxParticipants: 5, sessions: [], _count: { enrollments: 5 },
    } as never)

    const res = await enrollPost(createReq('/api/programs/prog-1/enroll', 'POST'), mockParams('prog-1'))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/programs/[id]/providers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 403 if not lead provider', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc-1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.programProvider.findFirst).mockResolvedValue(null)

    const res = await addProviderPost(
      createReq('/api/programs/prog-1/providers', 'POST', { userId: 'doc-2' }),
      mockParams('prog-1'),
    )
    expect(res.status).toBe(403)
  })

  it('adds collaborator', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc-1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.programProvider.findFirst).mockResolvedValue({ role: 'lead' } as never)
    vi.mocked(prisma.programProvider.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.programProvider.create).mockResolvedValue({ id: 'pp-1', role: 'collaborator' } as never)

    const res = await addProviderPost(
      createReq('/api/programs/prog-1/providers', 'POST', { userId: 'doc-2' }),
      mockParams('prog-1'),
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.role).toBe('collaborator')
  })
})
