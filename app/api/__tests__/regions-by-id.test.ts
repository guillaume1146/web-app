import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    region: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

import { GET } from '../regions/[id]/route'
import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/regions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns region by ID', async () => {
    vi.mocked(prisma.region.findUnique).mockResolvedValue({
      id: 'REG-MU', name: 'Mauritius', countryCode: 'MU', language: 'en',
      flag: '🇲🇺', currency: 'MUR', currencySymbol: 'Rs', trialCredit: 4500, isActive: true,
    } as never)

    const res = await GET(
      new NextRequest('http://localhost:3000/api/regions/REG-MU'),
      mockParams('REG-MU')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.countryCode).toBe('MU')
    expect(json.data.currency).toBe('MUR')
    expect(json.data.currencySymbol).toBe('Rs')
    expect(json.data.trialCredit).toBe(4500)
  })

  it('returns 404 for non-existent region', async () => {
    vi.mocked(prisma.region.findUnique).mockResolvedValue(null)

    const res = await GET(
      new NextRequest('http://localhost:3000/api/regions/bad'),
      mockParams('bad')
    )
    expect(res.status).toBe(404)
  })
})
