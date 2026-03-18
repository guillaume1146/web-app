import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/roles
 * Returns all provider roles with their specialties from the database.
 * Used by the subscription plan config UI to build dynamic quota/discount selectors.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const specialties = await prisma.providerSpecialty.findMany({
      where: { isActive: true },
      orderBy: [{ providerType: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        providerType: true,
        name: true,
        description: true,
      },
    })

    // Group by providerType
    const grouped: Record<string, { name: string; description: string | null }[]> = {}
    for (const s of specialties) {
      if (!grouped[s.providerType]) grouped[s.providerType] = []
      grouped[s.providerType].push({ name: s.name, description: s.description })
    }

    // Provider roles that are service providers (exclude admin/patient roles)
    const providerRoles = [
      'DOCTOR', 'NURSE', 'NANNY', 'CAREGIVER', 'PHYSIOTHERAPIST',
      'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST', 'PHARMACIST',
      'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
    ]

    const data = providerRoles.map(role => ({
      role,
      specialties: grouped[role] || [],
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/roles error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
