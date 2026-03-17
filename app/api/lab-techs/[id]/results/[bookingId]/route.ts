import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'
import { createNotification } from '@/lib/notifications'
import { z } from 'zod'

const submitResultSchema = z.object({
  resultFindings: z.string().min(1, 'Findings are required'),
  resultNotes: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id, bookingId } = await params
  if (auth.sub !== id) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const parsed = submitResultSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const labProfile = await prisma.labTechProfile.findUnique({
      where: { userId: id },
      select: { id: true },
    })

    if (!labProfile) {
      return NextResponse.json({ success: false, message: 'Lab tech profile not found' }, { status: 404 })
    }

    // Verify the booking belongs to this lab tech and is in a valid state
    const booking = await prisma.labTestBooking.findFirst({
      where: {
        id: bookingId,
        labTechId: labProfile.id,
        status: { in: ['upcoming', 'pending'] },
      },
      select: {
        id: true,
        testName: true,
        patient: {
          select: {
            userId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found or not eligible for results' },
        { status: 404 }
      )
    }

    // Update booking with results and mark as completed
    const updated = await prisma.labTestBooking.update({
      where: { id: bookingId },
      data: {
        resultFindings: parsed.data.resultFindings.trim(),
        resultNotes: parsed.data.resultNotes?.trim() || null,
        resultDate: new Date(),
        status: 'completed',
      },
      select: {
        id: true,
        testName: true,
        status: true,
        resultDate: true,
      },
    })

    // Notify the patient
    await createNotification({
      userId: booking.patient.userId,
      type: 'lab_result_ready',
      title: 'Lab Results Ready',
      message: `Your ${booking.testName} results are ready. View them in your Lab Testing section.`,
      referenceId: bookingId,
      referenceType: 'lab_test_booking',
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH lab result error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
