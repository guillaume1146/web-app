import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing the route
vi.mock('@/lib/db', () => ({
  default: {
    user: { count: vi.fn() },
    appointment: { count: vi.fn() },
    region: { count: vi.fn() },
    providerSpecialty: { count: vi.fn() },
    providerInventoryItem: { count: vi.fn() },
  },
}))

import { GET } from '../stats/route'
import prisma from '@/lib/db'

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct structure with all four stats', async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(25)   // providerCount
      .mockResolvedValueOnce(200)  // patientCount
    vi.mocked(prisma.appointment.count).mockResolvedValue(350)
    vi.mocked(prisma.region.count).mockResolvedValue(6)
    vi.mocked(prisma.providerSpecialty.count).mockResolvedValue(136)
    vi.mocked(prisma.providerInventoryItem.count).mockResolvedValue(76)

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(4)

    expect(data.data[0]).toEqual({
      number: 25,
      label: 'Healthcare Providers',
      color: 'text-blue-500',
    })
    expect(data.data[1]).toEqual({
      number: 200,
      label: 'Registered Patients',
      color: 'text-green-500',
    })
    expect(data.data[2]).toEqual({
      number: 136,
      label: 'Medical Specialties',
      color: 'text-purple-500',
    })
    expect(data.data[3]).toEqual({
      number: 76,
      label: 'Health Products',
      color: 'text-orange-500',
    })
  })

  it('counts providers excluding non-provider roles', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)
    vi.mocked(prisma.region.count).mockResolvedValue(0)
    vi.mocked(prisma.providerSpecialty.count).mockResolvedValue(0)
    vi.mocked(prisma.providerInventoryItem.count).mockResolvedValue(0)

    await GET()

    // First user.count call is for providers (excludes PATIENT, REGIONAL_ADMIN, etc.)
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: {
        userType: { notIn: ['PATIENT', 'REGIONAL_ADMIN', 'CORPORATE_ADMIN', 'INSURANCE_REP', 'REFERRAL_PARTNER'] },
        accountStatus: 'active',
      },
    })
    // Second call is for patients
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { userType: 'PATIENT' },
    })
  })

  it('counts only active specialties and in-stock products', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)
    vi.mocked(prisma.region.count).mockResolvedValue(0)
    vi.mocked(prisma.providerSpecialty.count).mockResolvedValue(0)
    vi.mocked(prisma.providerInventoryItem.count).mockResolvedValue(0)

    await GET()

    expect(prisma.providerSpecialty.count).toHaveBeenCalledWith({
      where: { isActive: true },
    })
    expect(prisma.providerInventoryItem.count).toHaveBeenCalledWith({
      where: { isActive: true, inStock: true },
    })
  })

  it('returns 500 with error on database failure', async () => {
    vi.mocked(prisma.user.count).mockRejectedValue(new Error('DB connection failed'))

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toBe('Failed to fetch statistics')
  })

  it('returns zeros when database is empty', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)
    vi.mocked(prisma.region.count).mockResolvedValue(0)
    vi.mocked(prisma.providerSpecialty.count).mockResolvedValue(0)
    vi.mocked(prisma.providerInventoryItem.count).mockResolvedValue(0)

    const res = await GET()
    const data = await res.json()

    expect(data.data.every((s: { number: number }) => s.number === 0)).toBe(true)
  })
})
