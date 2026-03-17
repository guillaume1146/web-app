import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/doctors/[id]
 * Public doctor profile (for patients viewing doctor details).
 * [id] is the doctor's userId.
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
    const doctor = await prisma.user.findUnique({
      where: { id, userType: 'DOCTOR' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        doctorProfile: {
          select: {
            id: true,
            specialty: true,
            subSpecialties: true,
            category: true,
            bio: true,
            experience: true,
            languages: true,
            location: true,
            consultationFee: true,
            videoConsultationFee: true,
            emergencyConsultationFee: true,
            consultationTypes: true,
            consultationDuration: true,
            rating: true,
            reviewCount: true,
            emergencyAvailable: true,
            homeVisitAvailable: true,
            telemedicineAvailable: true,
            philosophy: true,
            specialInterests: true,
            hospitalPrivileges: true,
            education: {
              select: { degree: true, institution: true, year: true },
              orderBy: { year: 'desc' },
            },
            services: {
              where: { isActive: true },
              select: { id: true, serviceName: true, description: true, price: true, duration: true, category: true },
            },
          },
        },
      },
    })

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor not found' }, { status: 404 })
    }

    const { id: profileId, ...profile } = doctor.doctorProfile
    return NextResponse.json({
      success: true,
      data: {
        userId: doctor.id,
        profileId,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        profileImage: doctor.profileImage,
        ...profile,
      },
    })
  } catch (error) {
    console.error('GET /api/doctors/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
