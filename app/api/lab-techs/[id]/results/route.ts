import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

// Map LabTestBooking.status values to the LabResult statuses expected by the UI.
// DB:  pending | upcoming  → UI: pending
// DB:  completed           → UI: ready
// DB:  cancelled           → excluded from results
function mapStatus(dbStatus: string): 'pending' | 'ready' | 'sent' | null {
  switch (dbStatus) {
    case 'pending':
    case 'upcoming':
      return 'pending'
    case 'completed':
      return 'ready'
    default:
      return null // cancelled — filter out
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.sub !== id) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  try {
    const labProfile = await prisma.labTechProfile.findUnique({
      where: { userId: id },
      select: { id: true },
    })

    if (!labProfile) {
      return NextResponse.json({ success: false, message: 'Lab tech profile not found' }, { status: 404 })
    }

    const bookings = await prisma.labTestBooking.findMany({
      where: {
        labTechId: labProfile.id,
        status: { not: 'cancelled' },
      },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        testName: true,
        status: true,
        scheduledAt: true,
        sampleType: true,
        resultFindings: true,
        resultNotes: true,
        resultDate: true,
        patient: {
          select: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    })

    const data = bookings.map((booking) => {
      const mappedStatus = mapStatus(booking.status) ?? 'pending'
      return {
        id: booking.id,
        patientName: booking.patient?.user
          ? `${booking.patient.user.firstName} ${booking.patient.user.lastName}`
          : 'Patient',
        testName: booking.testName,
        status: mappedStatus,
        date: booking.scheduledAt.toISOString(),
        ...(booking.sampleType ? { category: booking.sampleType } : {}),
        ...(booking.resultFindings ? { resultFindings: booking.resultFindings } : {}),
        ...(booking.resultNotes ? { resultNotes: booking.resultNotes } : {}),
        ...(booking.resultDate ? { resultDate: booking.resultDate.toISOString() } : {}),
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Lab tech results fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
