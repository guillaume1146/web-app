import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.userType === 'doctor' && auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    // id is User.id — resolve DoctorProfile.id for the appointment query
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: id },
      select: { id: true },
    })

    if (!doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor profile not found' }, { status: 404 })
    }

    // Get appointment stats per patient in a single query (avoids N+1)
    const appointmentStats = await prisma.appointment.groupBy({
      by: ['patientId'],
      where: { doctorId: doctorProfile.id },
      _count: { id: true },
      _max: { scheduledAt: true },
    })

    if (appointmentStats.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const patientIds = appointmentStats.map(s => s.patientId)

    // Single query for all patient details
    const patients = await prisma.patientProfile.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        userId: true,
        bloodType: true,
        allergies: true,
        chronicConditions: true,
        user: {
          select: {
            firstName: true, lastName: true, profileImage: true,
            phone: true, gender: true, dateOfBirth: true, email: true,
          },
        },
      },
    })

    // Build stats lookup
    const statsMap = new Map(appointmentStats.map(s => [s.patientId, s]))

    const data = patients.map(p => {
      const stats = statsMap.get(p.id)
      return {
        id: p.id,
        userId: p.userId,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        email: p.user.email,
        profileImage: p.user.profileImage,
        phone: p.user.phone,
        gender: p.user.gender,
        dateOfBirth: p.user.dateOfBirth,
        bloodType: p.bloodType,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
        lastVisit: stats?._max.scheduledAt,
        appointmentCount: stats?._count.id || 0,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Doctor patients fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
