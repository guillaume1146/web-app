import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    providerSpecialty: { findMany: vi.fn() },
    user: { groupBy: vi.fn() },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

import { GET } from '../roles/route'
import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

describe('GET /api/roles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns provider roles grouped with specialties', async () => {
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([
      { providerType: 'DOCTOR', name: 'General Practice', description: 'GP' },
      { providerType: 'DOCTOR', name: 'Cardiology', description: 'Heart' },
      { providerType: 'NURSE', name: 'General Nursing', description: 'General' },
      { providerType: 'CAREGIVER', name: 'Elder Care', description: 'Senior care' },
      { providerType: 'DENTIST', name: 'General Dentistry', description: 'Dental' },
    ] as never)
    vi.mocked(prisma.user.groupBy).mockResolvedValue([
      { userType: 'DOCTOR', _count: 3 },
      { userType: 'NURSE', _count: 2 },
      { userType: 'CAREGIVER', _count: 2 },
      { userType: 'DENTIST', _count: 1 },
    ] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/roles'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThanOrEqual(4)

    const doctor = json.data.find((r: { role: string }) => r.role === 'DOCTOR')
    expect(doctor).toBeTruthy()
    expect(doctor.specialties).toHaveLength(2)
    expect(doctor.label).toBe('Doctors')
    expect(doctor.providerCount).toBe(3)

    const caregiver = json.data.find((r: { role: string }) => r.role === 'CAREGIVER')
    expect(caregiver.specialties).toHaveLength(1)
  })

  it('returns roles from DB not hardcoded', async () => {
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([
      { providerType: 'CAREGIVER', name: 'Elder Care', description: null },
      { providerType: 'PHYSIOTHERAPIST', name: 'Sports', description: null },
    ] as never)
    vi.mocked(prisma.user.groupBy).mockResolvedValue([] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/roles'))
    const json = await res.json()

    const roles = json.data.map((r: { role: string }) => r.role)
    expect(roles).toContain('CAREGIVER')
    expect(roles).toContain('PHYSIOTHERAPIST')
    expect(roles).not.toContain('PATIENT')
    expect(roles).not.toContain('REGIONAL_ADMIN')
  })

  it('includes searchPath and color for each role', async () => {
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([
      { providerType: 'DENTIST', name: 'General', description: null },
    ] as never)
    vi.mocked(prisma.user.groupBy).mockResolvedValue([{ userType: 'DENTIST', _count: 1 }] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/roles'))
    const json = await res.json()

    const dentist = json.data.find((r: { role: string }) => r.role === 'DENTIST')
    expect(dentist.searchPath).toBe('/search/dentists')
    expect(dentist.color).toBe('sky')
    expect(dentist.icon).toBe('FaTooth')
  })
})
