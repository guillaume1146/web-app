import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  default: {
    providerSpecialty: { findMany: vi.fn() },
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
      { id: '1', providerType: 'DOCTOR', name: 'General Practice', description: 'GP', isActive: true, createdAt: new Date() },
      { id: '2', providerType: 'DOCTOR', name: 'Cardiology', description: 'Heart', isActive: true, createdAt: new Date() },
      { id: '3', providerType: 'NURSE', name: 'General Nursing', description: 'General', isActive: true, createdAt: new Date() },
      { id: '4', providerType: 'CAREGIVER', name: 'Elder Care', description: 'Senior care', isActive: true, createdAt: new Date() },
      { id: '5', providerType: 'DENTIST', name: 'General Dentistry', description: 'Dental', isActive: true, createdAt: new Date() },
    ] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/roles'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // Should include all 11 provider roles
    expect(json.data).toHaveLength(11)

    // Doctor should have 2 specialties
    const doctor = json.data.find((r: { role: string }) => r.role === 'DOCTOR')
    expect(doctor.specialties).toHaveLength(2)
    expect(doctor.specialties[0].name).toBe('General Practice')

    // Caregiver should have 1 specialty
    const caregiver = json.data.find((r: { role: string }) => r.role === 'CAREGIVER')
    expect(caregiver.specialties).toHaveLength(1)

    // Dentist should have 1 specialty
    const dentist = json.data.find((r: { role: string }) => r.role === 'DENTIST')
    expect(dentist.specialties).toHaveLength(1)

    // Roles without seeded specialties should have empty array
    const physio = json.data.find((r: { role: string }) => r.role === 'PHYSIOTHERAPIST')
    expect(physio.specialties).toHaveLength(0)
  })

  it('returns all new provider roles', async () => {
    vi.mocked(prisma.providerSpecialty.findMany).mockResolvedValue([] as never)

    const res = await GET(new NextRequest('http://localhost:3000/api/roles'))
    const json = await res.json()

    const roles = json.data.map((r: { role: string }) => r.role)
    expect(roles).toContain('CAREGIVER')
    expect(roles).toContain('PHYSIOTHERAPIST')
    expect(roles).toContain('DENTIST')
    expect(roles).toContain('OPTOMETRIST')
    expect(roles).toContain('NUTRITIONIST')
    expect(roles).not.toContain('PATIENT')
    expect(roles).not.toContain('REGIONAL_ADMIN')
  })
})
