import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing the route
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      count: vi.fn(),
    },
    appointment: {
      count: vi.fn(),
    },
    doctorProfile: {
      findMany: vi.fn(),
    },
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
      .mockResolvedValueOnce(15) // doctorCount
      .mockResolvedValueOnce(200) // patientCount
    vi.mocked(prisma.appointment.count).mockResolvedValue(350)
    vi.mocked(prisma.doctorProfile.findMany).mockResolvedValue([
      { clinicAffiliation: 'Port Louis' },
      { clinicAffiliation: 'Curepipe' },
      { clinicAffiliation: 'Quatre Bornes' },
    ] as never)

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(4)

    // Values are real DB counts — no floor values
    expect(data.data[0]).toEqual({
      number: 15,
      label: 'Qualified Doctors',
      color: 'text-blue-500',
    })
    expect(data.data[1]).toEqual({
      number: 200,
      label: 'Happy Patients',
      color: 'text-green-500',
    })
    expect(data.data[2]).toEqual({
      number: 350,
      label: 'Consultations',
      color: 'text-purple-500',
    })
    expect(data.data[3]).toEqual({
      number: 3,
      label: 'Cities Covered',
      color: 'text-orange-500',
    })
  })

  it('queries doctors with active status filter', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)
    vi.mocked(prisma.doctorProfile.findMany).mockResolvedValue([])

    await GET()

    // First call is for doctors (active only)
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { userType: 'DOCTOR', accountStatus: 'active' },
    })
    // Second call is for patients (all statuses)
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { userType: 'PATIENT' },
    })
  })

  it('returns 0 for city count when no cities found', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)
    vi.mocked(prisma.doctorProfile.findMany).mockResolvedValue([])

    const res = await GET()
    const data = await res.json()

    expect(data.data[3].number).toBe(0)
  })

  it('returns 500 with error on database failure', async () => {
    vi.mocked(prisma.user.count).mockRejectedValue(new Error('DB connection failed'))

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.message).toBe('Failed to fetch statistics')
  })

  it('queries distinct clinic affiliations for city count', async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(0)
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)
    vi.mocked(prisma.doctorProfile.findMany).mockResolvedValue([])

    await GET()

    expect(prisma.doctorProfile.findMany).toHaveBeenCalledWith({
      where: { clinicAffiliation: { not: '' } },
      select: { clinicAffiliation: true },
      distinct: ['clinicAffiliation'],
    })
  })
})
