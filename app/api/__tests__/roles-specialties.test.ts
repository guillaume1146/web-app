import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    providerSpecialty: { findMany: vi.fn() },
    providerRole: { findMany: vi.fn() },
    user: { groupBy: vi.fn() },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitPublic: vi.fn(() => null),
}))

import { GET } from '../roles/route'
import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

const mockRole = (code: string, label: string, slug: string, icon: string, color: string, isProvider = true) => ({
  id: `role-${code}`,
  code,
  label,
  singularLabel: label.replace(/s$/, ''),
  slug,
  icon,
  color,
  cardImage: null,
  description: null,
  searchEnabled: true,
  bookingEnabled: true,
  inventoryEnabled: true,
  isProvider,
  isActive: true,
  displayOrder: 10,
  urlPrefix: `/${slug}`,
  cookieValue: slug,
  regionCode: null,
  createdByAdminId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  verificationDocs: [],
})

describe('GET /api/roles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns provider roles from ProviderRole table with specialties', async () => {
    vi.mocked(prisma.providerRole.findMany).mockResolvedValue([
      mockRole('DOCTOR', 'Doctors', 'doctors', 'FaUserMd', '#0C6780'),
      mockRole('NURSE', 'Nurses', 'nurses', 'FaUserNurse', '#0891B2'),
      mockRole('CAREGIVER', 'Caregivers', 'caregivers', 'FaHandHoldingHeart', '#EC4899'),
      mockRole('DENTIST', 'Dentists', 'dentists', 'FaTooth', '#0EA5E9'),
    ] as never)
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([
      { providerType: 'DOCTOR', name: 'General Practice', description: 'GP' },
      { providerType: 'DOCTOR', name: 'Cardiology', description: 'Heart' },
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
    expect(json.data).toHaveLength(4)

    const doctor = json.data.find((r: { code: string }) => r.code === 'DOCTOR')
    expect(doctor).toBeTruthy()
    expect(doctor.specialties).toHaveLength(2)
    expect(doctor.label).toBe('Doctors')
    expect(doctor.providerCount).toBe(3)
    expect(doctor.searchPath).toBe('/search/doctors')
  })

  it('returns roles from DB not hardcoded', async () => {
    vi.mocked(prisma.providerRole.findMany).mockResolvedValue([
      mockRole('CAREGIVER', 'Caregivers', 'caregivers', 'FaHandHoldingHeart', '#EC4899'),
      mockRole('PHYSIOTHERAPIST', 'Physiotherapists', 'physiotherapists', 'FaWalking', '#2563EB'),
    ] as never)
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.user.groupBy).mockResolvedValue([] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/roles'))
    const json = await res.json()

    const codes = json.data.map((r: { code: string }) => r.code)
    expect(codes).toContain('CAREGIVER')
    expect(codes).toContain('PHYSIOTHERAPIST')
  })

  it('includes searchPath and icon for each role', async () => {
    vi.mocked(prisma.providerRole.findMany).mockResolvedValue([
      mockRole('DENTIST', 'Dentists', 'dentists', 'FaTooth', '#0EA5E9'),
    ] as never)
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.user.groupBy).mockResolvedValue([{ userType: 'DENTIST', _count: 1 }] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/roles'))
    const json = await res.json()

    const dentist = json.data.find((r: { code: string }) => r.code === 'DENTIST')
    expect(dentist.searchPath).toBe('/search/dentists')
    expect(dentist.icon).toBe('FaTooth')
    expect(dentist.color).toBe('#0EA5E9')
    expect(dentist.providerCount).toBe(1)
  })
})
