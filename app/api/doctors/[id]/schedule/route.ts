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

  try {
    // id is User.id — resolve DoctorProfile.id for the schedule query
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: id },
      select: { id: true },
    })

    if (!doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor profile not found' }, { status: 404 })
    }

    const slots = await prisma.scheduleSlot.findMany({
      where: { doctorId: doctorProfile.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json({ success: true, data: slots })
  } catch (error) {
    console.error('Schedule fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
