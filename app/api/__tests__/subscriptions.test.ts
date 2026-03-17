import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    subscriptionPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

import { GET as getPlans } from '../subscriptions/route'
import { GET as getPlan } from '../subscriptions/[id]/route'
import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

function createGetRequest(url: string) {
  return new NextRequest(`http://localhost:3000${url}`, { method: 'GET' })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/subscriptions', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns all active plans', async () => {
    const plans = [
      { id: '1', name: 'Essential', slug: 'essential', type: 'individual', price: 250 },
      { id: '2', name: 'Plus', slug: 'plus', type: 'individual', price: 500 },
    ]
    vi.mocked(prisma.subscriptionPlan.findMany).mockResolvedValue(plans as never)

    const res = await getPlans(createGetRequest('/api/subscriptions'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(2)
  })

  it('filters by type when query param provided', async () => {
    vi.mocked(prisma.subscriptionPlan.findMany).mockResolvedValue([] as never)

    await getPlans(createGetRequest('/api/subscriptions?type=corporate'))

    expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ isActive: true }, { type: 'corporate' }] },
      })
    )
  })

  it('returns all types when no filter', async () => {
    vi.mocked(prisma.subscriptionPlan.findMany).mockResolvedValue([] as never)

    await getPlans(createGetRequest('/api/subscriptions'))

    expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      })
    )
  })
})

describe('GET /api/subscriptions/[id]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns plan by ID or slug', async () => {
    const plan = { id: '1', name: 'Essential', slug: 'essential', type: 'individual', price: 250 }
    vi.mocked(prisma.subscriptionPlan.findFirst).mockResolvedValue(plan as never)

    const res = await getPlan(createGetRequest('/api/subscriptions/essential'), mockParams('essential'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('Essential')
  })

  it('returns 404 for non-existent plan', async () => {
    vi.mocked(prisma.subscriptionPlan.findFirst).mockResolvedValue(null)

    const res = await getPlan(createGetRequest('/api/subscriptions/nonexistent'), mockParams('nonexistent'))
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.success).toBe(false)
  })
})
