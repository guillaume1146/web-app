import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'
import { UserType } from '@prisma/client'
import { userTypeToProfileRelation } from '@/lib/auth/user-type-map'

/**
 * Map each UserType to the correct specialization field name in its profile table.
 * DoctorProfile uses `specialty`, most others use `specializations`,
 * and some (Nanny, EmergencyWorker) have no specialization field.
 */
const SPECIALIZATION_FIELD: Partial<Record<UserType, string>> = {
  DOCTOR: 'specialty',
  NURSE: 'specializations',
  PHARMACIST: 'specializations',
  LAB_TECHNICIAN: 'specializations',
  CAREGIVER: 'specializations',
  PHYSIOTHERAPIST: 'specializations',
  DENTIST: 'specializations',
  OPTOMETRIST: 'specializations',
  NUTRITIONIST: 'specializations',
  // NANNY, EMERGENCY_WORKER — no specialization field on their profile
}

/**
 * GET /api/search/providers?type=CAREGIVER&q=search
 * Search providers by user type. Returns basic profile info.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as UserType | null
    const query = searchParams.get('q')

    if (!type) {
      return NextResponse.json({ success: false, message: 'type parameter required' }, { status: 400 })
    }

    const providerTypes: UserType[] = [
      'CAREGIVER', 'PHYSIOTHERAPIST', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
      'DOCTOR', 'NURSE', 'NANNY', 'PHARMACIST', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
    ] as UserType[]

    if (!providerTypes.includes(type)) {
      return NextResponse.json({ success: false, message: 'Invalid provider type' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      userType: type,
      accountStatus: 'active',
    }

    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ]
    }

    const profileRelation = userTypeToProfileRelation[type]
    const specField = SPECIALIZATION_FIELD[type]

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        address: true,
        verified: true,
        ...(profileRelation && specField ? {
          [profileRelation]: {
            select: { [specField]: true },
          },
        } : {}),
      },
      take: 50,
      orderBy: { firstName: 'asc' },
    })

    const data = users.map(u => {
      const profile = profileRelation && specField
        ? (u as Record<string, unknown>)[profileRelation] as Record<string, string[]> | null
        : null
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImage: u.profileImage,
        address: u.address,
        verified: u.verified,
        specializations: profile?.[specField!] ?? [],
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/search/providers error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
