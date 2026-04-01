// @vitest-environment node
/**
 * Specialties CRUD API Tests
 *
 * Tests GET, POST, PATCH, DELETE for /api/specialties
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  default: {
    providerSpecialty: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/validate', () => ({ validateRequest: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
  rateLimitAuth: vi.fn(() => null),
}))

import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

let GET: typeof import('../specialties/route').GET
let POST: typeof import('../specialties/route').POST

describe('GET /api/specialties', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../specialties/route')
    GET = mod.GET
    POST = mod.POST
  })

  it('returns all active specialties', async () => {
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([
      { id: '1', providerType: 'DOCTOR', name: 'Cardiology', description: 'Heart', isActive: true },
      { id: '2', providerType: 'NURSE', name: 'ICU', description: 'Critical', isActive: true },
    ] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/specialties'))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(2)
  })

  it('filters by providerType', async () => {
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([
      { id: '1', providerType: 'DOCTOR', name: 'Cardiology', description: 'Heart', isActive: true },
    ] as never)

    await GET(new NextRequest('http://localhost:3000/api/specialties?providerType=DOCTOR'))

    expect(prisma.providerSpecialty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ providerType: 'DOCTOR' }) })
    )
  })

  it('uppercases providerType filter', async () => {
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([])
    await GET(new NextRequest('http://localhost:3000/api/specialties?providerType=doctor'))
    expect(prisma.providerSpecialty.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ providerType: 'DOCTOR' }) })
    )
  })
})

describe('POST /api/specialties', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../specialties/route')
    POST = mod.POST
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)
    const res = await POST(new NextRequest('http://localhost:3000/api/specialties', {
      method: 'POST', body: JSON.stringify({ providerType: 'DOCTOR', name: 'Test' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    const res = await POST(new NextRequest('http://localhost:3000/api/specialties', {
      method: 'POST', body: JSON.stringify({ providerType: 'DOCTOR', name: 'Test' }),
    }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when providerType missing', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    const res = await POST(new NextRequest('http://localhost:3000/api/specialties', {
      method: 'POST', body: JSON.stringify({ name: 'Test' }),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name too short', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    const res = await POST(new NextRequest('http://localhost:3000/api/specialties', {
      method: 'POST', body: JSON.stringify({ providerType: 'DOCTOR', name: 'X' }),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 409 for duplicate specialty', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findFirst).mockResolvedValue({ id: 'existing' } as never)
    const res = await POST(new NextRequest('http://localhost:3000/api/specialties', {
      method: 'POST', body: JSON.stringify({ providerType: 'DOCTOR', name: 'Cardiology' }),
    }))
    expect(res.status).toBe(409)
  })

  it('creates specialty for regional-admin', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.providerSpecialty.create).mockResolvedValue({
      id: 'new', providerType: 'DENTIST', name: 'Implantology', description: 'Dental implants', isActive: true,
    } as never)

    const res = await POST(new NextRequest('http://localhost:3000/api/specialties', {
      method: 'POST', body: JSON.stringify({ providerType: 'DENTIST', name: 'Implantology', description: 'Dental implants' }),
    }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.data.name).toBe('Implantology')
  })

  it('creates specialty for admin', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.providerSpecialty.create).mockResolvedValue({
      id: 'new2', providerType: 'NURSE', name: 'Dialysis Nursing', description: null, isActive: true,
    } as never)

    const res = await POST(new NextRequest('http://localhost:3000/api/specialties', {
      method: 'POST', body: JSON.stringify({ providerType: 'nurse', name: 'Dialysis Nursing' }),
    }))
    expect(res.status).toBe(201)
  })
})

describe('PATCH /api/specialties/[id]', () => {
  let PATCH: typeof import('../specialties/[id]/route').PATCH

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../specialties/[id]/route')
    PATCH = mod.PATCH
  })

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)
    const res = await PATCH(
      new NextRequest('http://localhost:3000/api/specialties/s1', { method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
      { params: Promise.resolve({ id: 's1' }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 when specialty not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findUnique).mockResolvedValue(null)
    const res = await PATCH(
      new NextRequest('http://localhost:3000/api/specialties/fake', { method: 'PATCH', body: JSON.stringify({ name: 'Updated' }) }),
      { params: Promise.resolve({ id: 'fake' }) }
    )
    expect(res.status).toBe(404)
  })

  it('updates specialty name and description', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findUnique).mockResolvedValue({ id: 's1' } as never)
    vi.mocked(prisma.providerSpecialty.update).mockResolvedValue({
      id: 's1', providerType: 'DOCTOR', name: 'Updated Name', description: 'Updated desc', isActive: true,
    } as never)

    const res = await PATCH(
      new NextRequest('http://localhost:3000/api/specialties/s1', {
        method: 'PATCH', body: JSON.stringify({ name: 'Updated Name', description: 'Updated desc' }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    )
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('Updated Name')
  })

  it('can deactivate a specialty', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findUnique).mockResolvedValue({ id: 's1' } as never)
    vi.mocked(prisma.providerSpecialty.update).mockResolvedValue({
      id: 's1', providerType: 'DOCTOR', name: 'Cardiology', description: null, isActive: false,
    } as never)

    const res = await PATCH(
      new NextRequest('http://localhost:3000/api/specialties/s1', {
        method: 'PATCH', body: JSON.stringify({ isActive: false }),
      }),
      { params: Promise.resolve({ id: 's1' }) }
    )
    const json = await res.json()
    expect(json.data.isActive).toBe(false)
  })
})

describe('DELETE /api/specialties/[id]', () => {
  let DELETE: typeof import('../specialties/[id]/route').DELETE

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../specialties/[id]/route')
    DELETE = mod.DELETE
  })

  it('returns 404 when specialty not found', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findUnique).mockResolvedValue(null)
    const res = await DELETE(
      new NextRequest('http://localhost:3000/api/specialties/fake', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'fake' }) }
    )
    expect(res.status).toBe(404)
  })

  it('soft-deletes specialty (sets isActive=false)', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'a1', userType: 'regional-admin', email: 'a@ex.com' })
    vi.mocked(prisma.providerSpecialty.findUnique).mockResolvedValue({ id: 's1' } as never)
    vi.mocked(prisma.providerSpecialty.update).mockResolvedValue({ id: 's1', isActive: false } as never)

    const res = await DELETE(
      new NextRequest('http://localhost:3000/api/specialties/s1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 's1' }) }
    )
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.providerSpecialty.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
  })

  it('returns 403 for non-admin', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'u1', userType: 'doctor', email: 'd@ex.com' })
    const res = await DELETE(
      new NextRequest('http://localhost:3000/api/specialties/s1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 's1' }) }
    )
    expect(res.status).toBe(403)
  })
})
