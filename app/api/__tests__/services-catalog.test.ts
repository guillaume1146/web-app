import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    platformService: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    providerServiceConfig: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    region: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/validate', () => ({
  validateRequest: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitAuth: vi.fn(() => null),
}))

import { GET as getCatalog } from '../services/catalog/route'
import { POST as createCustom } from '../services/custom/route'
import { GET as getMyServices, PATCH as updateMyService } from '../services/my-services/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

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

describe('GET /api/services/catalog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await getCatalog(createReq('/api/services/catalog'))
    expect(res.status).toBe(401)
  })

  it('returns grouped services', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.platformService.findMany).mockResolvedValue([
      { id: 's1', providerType: 'DOCTOR', serviceName: 'General Consultation', category: 'Consultation', defaultPrice: 800, currency: 'MUR', duration: 30, isDefault: true, countryCode: null, description: 'GP consult' },
      { id: 's2', providerType: 'NURSE', serviceName: 'Wound Care', category: 'Wound Care', defaultPrice: 500, currency: 'MUR', duration: 45, isDefault: true, countryCode: null, description: 'Wound care' },
    ] as never)

    const res = await getCatalog(createReq('/api/services/catalog'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.length).toBe(2)
    expect(json.data[0].category).toContain('DOCTOR')
    expect(json.data[0].services[0].serviceName).toBe('General Consultation')
  })

  it('filters by providerType', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.platformService.findMany).mockResolvedValue([] as never)

    await getCatalog(createReq('/api/services/catalog?providerType=DOCTOR'))

    expect(prisma.platformService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ providerType: 'DOCTOR' }),
      })
    )
  })
})

describe('POST /api/services/custom', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await createCustom(createReq('/api/services/custom', 'POST', { serviceName: 'Test' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-provider users', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'u1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1', userType: 'PATIENT', regionId: null } as never)

    const res = await createCustom(createReq('/api/services/custom', 'POST', {
      serviceName: 'Test', category: 'Custom', description: 'test', defaultPrice: 100,
    }))
    expect(res.status).toBe(403)
  })

  it('creates custom service for doctor', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'doc1', userType: 'DOCTOR', regionId: 'REG-MU' } as never)
    vi.mocked(prisma.platformService.findFirst).mockResolvedValue(null) // no existing
    vi.mocked(prisma.region.findUnique).mockResolvedValue({ countryCode: 'MU' } as never)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      const tx = {
        platformService: { create: vi.fn().mockResolvedValue({ id: 'svc-new' }) },
        providerServiceConfig: { create: vi.fn() },
      }
      return (fn as (t: typeof tx) => Promise<unknown>)(tx)
    })

    const res = await createCustom(createReq('/api/services/custom', 'POST', {
      serviceName: 'Tele-Derma', category: 'Specialist', description: 'Remote skin consultation', defaultPrice: 1800,
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.isNew).toBe(true)
  })

  it('adds existing service to provider catalog', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'doc1', userType: 'DOCTOR', regionId: null } as never)
    vi.mocked(prisma.platformService.findFirst).mockResolvedValue({ id: 'existing-svc' } as never)
    vi.mocked(prisma.providerServiceConfig.upsert).mockResolvedValue({} as never)

    const res = await createCustom(createReq('/api/services/custom', 'POST', {
      serviceName: 'General Consultation', category: 'Consultation', description: 'GP', defaultPrice: 800,
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.isNew).toBe(false)
  })

  it('returns 400 for missing required fields', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'doc1', userType: 'DOCTOR', regionId: null } as never)

    const res = await createCustom(createReq('/api/services/custom', 'POST', { serviceName: '' }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/services/my-services', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockResolvedValue(null)
    const res = await getMyServices(createReq('/api/services/my-services'))
    expect(res.status).toBe(401)
  })

  it('returns provider services with effective prices', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.providerServiceConfig.findMany).mockResolvedValue([
      {
        id: 'cfg1', platformServiceId: 's1', priceOverride: 1200, isActive: true,
        platformService: { id: 's1', serviceName: 'General Consult', category: 'Consultation', description: '', defaultPrice: 800, currency: 'MUR', duration: 30, isDefault: true },
      },
    ] as never)

    const res = await getMyServices(createReq('/api/services/my-services'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data[0].effectivePrice).toBe(1200) // priceOverride takes precedence
    expect(json.data[0].defaultPrice).toBe(800)
  })
})

describe('PATCH /api/services/my-services', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 for config not owned by user', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.providerServiceConfig.findUnique).mockResolvedValue({ providerUserId: 'other' } as never)

    const res = await updateMyService(createReq('/api/services/my-services', 'PATCH', {
      configId: 'cfg1', priceOverride: 900,
    }))
    expect(res.status).toBe(404)
  })

  it('updates price override', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc1', userType: 'doctor', email: 'a@b.com' })
    vi.mocked(prisma.providerServiceConfig.findUnique).mockResolvedValue({ providerUserId: 'doc1' } as never)
    vi.mocked(prisma.providerServiceConfig.update).mockResolvedValue({ id: 'cfg1', priceOverride: 900 } as never)

    const res = await updateMyService(createReq('/api/services/my-services', 'PATCH', {
      configId: 'cfg1', priceOverride: 900,
    }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns 400 for missing configId', async () => {
    vi.mocked(validateRequest).mockResolvedValue({ sub: 'doc1', userType: 'doctor', email: 'a@b.com' })

    const res = await updateMyService(createReq('/api/services/my-services', 'PATCH', { priceOverride: 900 }))
    expect(res.status).toBe(400)
  })
})
