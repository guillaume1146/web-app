import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    regionalAdminProfile: { findFirst: vi.fn() },
    serviceGroup: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    serviceGroupItem: { createMany: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { GET, POST } from '../regional/service-groups/route'
import { PATCH, DELETE as deleteGroup } from '../regional/service-groups/[id]/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

function createReq(url: string, method = 'GET', body?: Record<string, unknown>) {
  if (body) {
    return new NextRequest(`http://localhost:3000${url}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }
  return new NextRequest(`http://localhost:3000${url}`, { method })
}

describe('GET /api/regional/service-groups', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await GET(createReq('/api/regional/service-groups'))
    expect(res.status).toBe(401)
  })

  it('returns groups for admin region', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.serviceGroup.findMany).mockResolvedValue([
      { id: 'g1', name: 'GP Services', items: [] },
    ] as never)

    const res = await GET(createReq('/api/regional/service-groups'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
  })
})

describe('POST /api/regional/service-groups', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for missing name', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)

    const res = await POST(createReq('/api/regional/service-groups', 'POST', { name: '', serviceIds: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty serviceIds', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)

    const res = await POST(createReq('/api/regional/service-groups', 'POST', {
      name: 'Group', serviceIds: [],
    }))
    expect(res.status).toBe(400)
  })

  it('creates group with services', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.regionalAdminProfile.findFirst).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        serviceGroup: { create: vi.fn().mockResolvedValue({ id: 'g-new', name: 'GP Pack' }) },
        serviceGroupItem: { createMany: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const res = await POST(createReq('/api/regional/service-groups', 'POST', {
      name: 'GP Pack',
      description: 'Basic GP services',
      serviceIds: ['svc-1', 'svc-2'],
    }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.data.name).toBe('GP Pack')
  })
})

describe('PATCH /api/regional/service-groups/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when group not found or not owned', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.serviceGroup.findUnique).mockResolvedValue(null)

    const res = await PATCH(
      createReq('/api/regional/service-groups/g1', 'PATCH', { name: 'Updated' }),
      mockParams('g1'),
    )
    expect(res.status).toBe(404)
  })

  it('updates group name and services', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.serviceGroup.findUnique).mockResolvedValue({ id: 'g1', createdByAdminId: 'u1' } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        serviceGroup: { update: vi.fn() },
        serviceGroupItem: { deleteMany: vi.fn(), createMany: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const res = await PATCH(
      createReq('/api/regional/service-groups/g1', 'PATCH', { name: 'Updated', serviceIds: ['svc-3'] }),
      mockParams('g1'),
    )
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/regional/service-groups/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes group owned by admin', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.serviceGroup.findUnique).mockResolvedValue({ id: 'g1', createdByAdminId: 'u1' } as never)
    vi.mocked(prisma.serviceGroup.delete).mockResolvedValue({} as never)

    const res = await deleteGroup(createReq('/api/regional/service-groups/g1', 'DELETE'), mockParams('g1'))
    expect(res.status).toBe(200)
  })

  it('returns 404 for group not owned by admin', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'regional-admin', email: 'a@b.com' })
    vi.mocked(prisma.serviceGroup.findUnique).mockResolvedValue({ id: 'g1', createdByAdminId: 'other-admin' } as never)

    const res = await deleteGroup(createReq('/api/regional/service-groups/g1', 'DELETE'), mockParams('g1'))
    expect(res.status).toBe(404)
  })
})
