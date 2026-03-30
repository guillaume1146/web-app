import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    user: { findUnique: vi.fn() },
    patientProfile: { findUnique: vi.fn(), create: vi.fn() },
    serviceBooking: { create: vi.fn(), findMany: vi.fn() },
    userSubscription: { findUnique: vi.fn() },
    subscriptionUsage: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    userWallet: { findUnique: vi.fn() },
    subscriptionPlanService: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/auth/validate', () => ({ validateRequest: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitPublic: vi.fn(() => null) }))
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }))
vi.mock('@/lib/bookings/ensure-patient-profile', () => ({ ensurePatientProfile: vi.fn() }))
vi.mock('@/lib/booking/check-balance', () => ({
  checkBookingCost: vi.fn(() => ({
    coveredBySubscription: false, discount: 0, discountPercent: 0,
    adjustedFee: 800, sufficient: true, balance: 5000, isCorporate: false, message: '',
  })),
}))

import { POST, GET } from '../bookings/service/route'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { NextRequest } from 'next/server'

function createReq(method: string, body?: Record<string, unknown>) {
  if (body) {
    return new NextRequest('http://localhost:3000/api/bookings/service', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
  }
  return new NextRequest('http://localhost:3000/api/bookings/service', { method })
}

describe('POST /api/bookings/service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 without auth', async () => {
    vi.mocked(validateRequest).mockReturnValue(null)
    const res = await POST(createReq('POST', { providerUserId: 'p1', providerType: 'DENTIST', scheduledDate: '2026-04-01', scheduledTime: '10:00' }))
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent provider', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await POST(createReq('POST', {
      providerUserId: 'bad', providerType: 'DENTIST',
      scheduledDate: '2026-04-01', scheduledTime: '10:00',
    }))
    expect(res.status).toBe(404)
  })

  it('creates booking for dentist', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'dent-1', firstName: 'Dr', lastName: 'Smith', userType: 'DENTIST' } as never)
      .mockResolvedValueOnce({ firstName: 'John', lastName: 'Doe' } as never)
    vi.mocked(prisma.serviceBooking.create).mockResolvedValue({
      id: 'bk-1', providerType: 'DENTIST', scheduledAt: new Date('2026-04-01T10:00:00'), status: 'pending',
    } as never)

    const res = await POST(createReq('POST', {
      providerUserId: 'dent-1', providerType: 'DENTIST',
      scheduledDate: '2026-04-01', scheduledTime: '10:00',
      serviceName: 'Dental Check-up',
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.booking.type).toBe('DENTIST')
  })

  it('creates booking for caregiver', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'care-1', firstName: 'Marie', lastName: 'Care', userType: 'CAREGIVER' } as never)
      .mockResolvedValueOnce({ firstName: 'John', lastName: 'Doe' } as never)
    vi.mocked(prisma.serviceBooking.create).mockResolvedValue({
      id: 'bk-2', providerType: 'CAREGIVER', scheduledAt: new Date(), status: 'pending',
    } as never)

    const res = await POST(createReq('POST', {
      providerUserId: 'care-1', providerType: 'CAREGIVER',
      scheduledDate: '2026-04-01', scheduledTime: '08:00',
    }))
    expect(res.status).toBe(200)
  })

  it('returns 400 for empty providerType', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'a@b.com' })

    const res = await POST(createReq('POST', {
      providerUserId: 'p1', providerType: '', // empty string not allowed
      scheduledDate: '2026-04-01', scheduledTime: '10:00',
    }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/bookings/service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns bookings for patient', async () => {
    vi.mocked(validateRequest).mockReturnValue({ sub: 'user-1', userType: 'patient', email: 'a@b.com' })
    vi.mocked(prisma.serviceBooking.findMany).mockResolvedValue([
      { id: 'bk-1', providerType: 'DENTIST', status: 'pending', scheduledAt: new Date() },
    ] as never)

    const res = await GET(createReq('GET'))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })
})
