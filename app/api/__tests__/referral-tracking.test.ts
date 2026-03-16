import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/db', () => ({
  default: {
    referralPartnerProfile: {
      findUnique: vi.fn(),
    },
    referralClick: {
      create: vi.fn(),
    },
  },
}))

// Mock rate limit
vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

import prisma from '@/lib/db'
import { POST } from '../referral-tracking/route'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/referral-tracking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/referral-tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if referralCode is missing', async () => {
    const res = await POST(makeRequest({ utmSource: 'facebook' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Referral code is required')
  })

  it('returns 404 if referral code does not exist', async () => {
    vi.mocked(prisma.referralPartnerProfile.findUnique).mockResolvedValue(null)

    const res = await POST(makeRequest({ referralCode: 'INVALID' }))
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.success).toBe(false)
  })

  it('creates a ReferralClick and returns trackingId on valid request', async () => {
    vi.mocked(prisma.referralPartnerProfile.findUnique).mockResolvedValue({
      id: 'rp1',
      userId: 'u1',
      referralCode: 'PARTNER1',
      commissionRate: 10,
      totalReferrals: 5,
      businessType: 'agency',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.mocked(prisma.referralClick.create).mockResolvedValue({
      id: 'click-123',
      referralCode: 'PARTNER1',
      utmSource: 'facebook',
      utmMedium: 'social',
      utmCampaign: 'partner1_referral_2026',
      location: 'mauritius',
      landingPage: '/',
      convertedUserId: null,
      convertedAt: null,
      createdAt: new Date(),
    })

    const res = await POST(makeRequest({
      referralCode: 'PARTNER1',
      utmSource: 'facebook',
      utmMedium: 'social',
      utmCampaign: 'partner1_referral_2026',
      location: 'mauritius',
      landingPage: '/',
    }))

    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.trackingId).toBe('click-123')

    expect(prisma.referralClick.create).toHaveBeenCalledWith({
      data: {
        referralCode: 'PARTNER1',
        utmSource: 'facebook',
        utmMedium: 'social',
        utmCampaign: 'partner1_referral_2026',
        location: 'mauritius',
        landingPage: '/',
      },
    })
  })

  it('handles optional fields as null', async () => {
    vi.mocked(prisma.referralPartnerProfile.findUnique).mockResolvedValue({
      id: 'rp1',
      userId: 'u1',
      referralCode: 'CODE1',
      commissionRate: 10,
      totalReferrals: 0,
      businessType: 'individual',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    vi.mocked(prisma.referralClick.create).mockResolvedValue({
      id: 'click-456',
      referralCode: 'CODE1',
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      location: null,
      landingPage: null,
      convertedUserId: null,
      convertedAt: null,
      createdAt: new Date(),
    })

    const res = await POST(makeRequest({ referralCode: 'CODE1' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    expect(prisma.referralClick.create).toHaveBeenCalledWith({
      data: {
        referralCode: 'CODE1',
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        location: null,
        landingPage: null,
      },
    })
  })

  it('handles server errors gracefully', async () => {
    vi.mocked(prisma.referralPartnerProfile.findUnique).mockRejectedValue(new Error('DB error'))

    const res = await POST(makeRequest({ referralCode: 'CODE1' }))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.message).toBe('Internal server error')
  })
})
