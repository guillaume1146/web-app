import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/nurses/[id]
 * Public nurse profile (for patients viewing nurse details).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id, userType: 'NURSE' },
      select: { id: true, firstName: true, lastName: true, profileImage: true },
    })
    if (!user) {
      return NextResponse.json({ success: false, message: 'Nurse not found' }, { status: 404 })
    }

    const nurseProfile = await prisma.nurseProfile.findUnique({
      where: { userId: id },
      select: {
        id: true,
        experience: true,
        specializations: true,
        nurseServiceCatalog: {
          where: { isActive: true },
          select: { id: true, serviceName: true, description: true, price: true, duration: true, category: true },
        },
      },
    })
    if (!nurseProfile) {
      return NextResponse.json({ success: false, message: 'Nurse profile not found' }, { status: 404 })
    }

    const { id: profileId, ...profile } = nurseProfile
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        profileId,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        ...profile,
      },
    })
  } catch (error) {
    console.error('GET /api/nurses/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
