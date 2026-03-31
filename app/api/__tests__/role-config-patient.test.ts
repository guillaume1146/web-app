// @vitest-environment node
/**
 * Role Config API Tests — Patient Feature Restrictions
 *
 * Verifies that the /api/role-config/[userType] endpoint
 * correctly returns feature configs, especially for PATIENT
 * which has services/practice/workflows/inventory disabled.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    roleFeatureConfig: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

let GET: typeof import('../role-config/[userType]/route').GET

describe('GET /api/role-config/[userType]', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../role-config/[userType]/route')
    GET = mod.GET
  })

  it('returns allEnabled=true when no config exists', async () => {
    vi.mocked(prisma.roleFeatureConfig.findMany).mockResolvedValue([])

    const req = new NextRequest('http://localhost:3000/api/role-config/UNKNOWN')
    const res = await GET(req, { params: Promise.resolve({ userType: 'UNKNOWN' }) })
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.allEnabled).toBe(true)
  })

  it('returns features map when config exists', async () => {
    vi.mocked(prisma.roleFeatureConfig.findMany).mockResolvedValue([
      { id: '1', userType: 'DOCTOR', featureKey: 'feed', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', userType: 'DOCTOR', featureKey: 'inventory', enabled: true, createdAt: new Date(), updatedAt: new Date() },
    ])

    const req = new NextRequest('http://localhost:3000/api/role-config/DOCTOR')
    const res = await GET(req, { params: Promise.resolve({ userType: 'DOCTOR' }) })
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.allEnabled).toBe(false)
    expect(json.data.features.feed).toBe(true)
    expect(json.data.features.inventory).toBe(true)
  })

  it('returns disabled features for PATIENT', async () => {
    vi.mocked(prisma.roleFeatureConfig.findMany).mockResolvedValue([
      { id: '1', userType: 'PATIENT', featureKey: 'feed', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '2', userType: 'PATIENT', featureKey: 'billing', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { id: '3', userType: 'PATIENT', featureKey: 'services', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '4', userType: 'PATIENT', featureKey: 'practice', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '5', userType: 'PATIENT', featureKey: 'workflows', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { id: '6', userType: 'PATIENT', featureKey: 'inventory', enabled: false, createdAt: new Date(), updatedAt: new Date() },
    ])

    const req = new NextRequest('http://localhost:3000/api/role-config/PATIENT')
    const res = await GET(req, { params: Promise.resolve({ userType: 'PATIENT' }) })
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.allEnabled).toBe(false)
    expect(json.data.features.feed).toBe(true)
    expect(json.data.features.billing).toBe(true)
    expect(json.data.features.services).toBe(false)
    expect(json.data.features.practice).toBe(false)
    expect(json.data.features.workflows).toBe(false)
    expect(json.data.features.inventory).toBe(false)
  })

  it('uppercases userType for query', async () => {
    vi.mocked(prisma.roleFeatureConfig.findMany).mockResolvedValue([])

    const req = new NextRequest('http://localhost:3000/api/role-config/patient')
    await GET(req, { params: Promise.resolve({ userType: 'patient' }) })

    expect(prisma.roleFeatureConfig.findMany).toHaveBeenCalledWith({
      where: { userType: 'PATIENT' },
      select: { featureKey: true, enabled: true },
    })
  })

  it('returns 500 on database error', async () => {
    vi.mocked(prisma.roleFeatureConfig.findMany).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost:3000/api/role-config/PATIENT')
    const res = await GET(req, { params: Promise.resolve({ userType: 'PATIENT' }) })

    expect(res.status).toBe(500)
  })
})
