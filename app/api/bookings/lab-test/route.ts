import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { createNotification } from '@/lib/notifications'
import { createLabTestBookingSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'
import { validateSlotAvailability } from '@/lib/booking/validate-availability'
import { checkBookingCost } from '@/lib/booking/check-balance'
import { ensurePatientProfile } from '@/lib/bookings/ensure-patient-profile'
import { attachWorkflow } from '@/lib/workflow/hook'

const DEFAULT_LAB_TEST_PRICE = 500

export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createLabTestBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { labTechId: rawLabTechId, testName, scheduledDate, scheduledTime, sampleType, notes, price } = parsed.data

    // Find or auto-create patient profile (any user type can book lab tests)
    const patientProfile = await ensurePatientProfile(auth.sub)

    // If labTechId provided, verify it exists (try profile ID first, then user ID)
    let labTechUserId: string | null = null
    let labTechId: string | null = rawLabTechId || null
    if (rawLabTechId) {
      let labTechProfile = await prisma.labTechProfile.findUnique({
        where: { id: rawLabTechId },
        select: { id: true, userId: true },
      })
      if (!labTechProfile) {
        labTechProfile = await prisma.labTechProfile.findFirst({
          where: { userId: rawLabTechId },
          select: { id: true, userId: true },
        })
      }

      if (!labTechProfile) {
        return NextResponse.json(
          { success: false, message: 'Lab technician profile not found' },
          { status: 404 }
        )
      }
      labTechUserId = labTechProfile.userId
      labTechId = labTechProfile.id
    }

    const fee = price && price > 0 ? price : DEFAULT_LAB_TEST_PRICE

    // Check patient wallet balance with subscription benefits
    const costCheck = await checkBookingCost({
      patientUserId: auth.sub,
      baseFee: fee,
      provider: { role: 'LAB_TECHNICIAN' },
      serviceType: 'lab',
    })
    if (!costCheck.sufficient) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient balance. You need ${costCheck.adjustedFee} but only have ${costCheck.balance?.toFixed(2) ?? '0'}. Please top up your wallet.`,
          costBreakdown: {
            originalFee: fee,
            adjustedFee: costCheck.adjustedFee,
            discount: costCheck.discount,
            coveredBySubscription: costCheck.coveredBySubscription,
          },
        },
        { status: 400 }
      )
    }

    // Validate slot availability if a lab tech is assigned (provider settings + no conflicting bookings)
    if (labTechId) {
      const slotCheck = await validateSlotAvailability(labTechId, 'lab-test', scheduledDate, scheduledTime)
      if (!slotCheck.available) {
        return NextResponse.json(
          { success: false, message: slotCheck.reason },
          { status: 409 }
        )
      }
    }

    // Combine date and time
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

    // Create booking with pending status (no wallet debit — happens on provider approval)
    const booking = await prisma.labTestBooking.create({
      data: {
        patientId: patientProfile.id,
        labTechId: labTechId || null,
        testName: testName.trim(),
        scheduledAt,
        sampleType: sampleType?.trim() || null,
        notes: notes?.trim() || null,
        price: costCheck.adjustedFee,
        status: 'pending',
      },
      select: {
        id: true,
        testName: true,
        scheduledAt: true,
        status: true,
      },
    })

    // Attach workflow instance — workflow handles provider notification
    let wfAttached = false
    if (labTechUserId) {
      const wf = await attachWorkflow({
        bookingId: booking.id,
        bookingRoute: 'lab-test',
        patientUserId: auth.sub,
        providerUserId: labTechUserId,
        providerType: 'LAB_TECHNICIAN',
        consultationType: 'in_person',
        servicePrice: costCheck.adjustedFee,
      })
      wfAttached = !!wf.workflowInstanceId
    }

    // Fallback notification only if workflow was not attached
    if (labTechUserId && !wfAttached) {
      const patientUser = await prisma.user.findUnique({
        where: { id: auth.sub },
        select: { firstName: true, lastName: true },
      })

      await createNotification({
        userId: labTechUserId,
        type: 'booking_request',
        title: 'New Lab Test Request',
        message: `${patientUser?.firstName} ${patientUser?.lastName} has requested a ${testName.trim()} test on ${scheduledDate} at ${scheduledTime}`,
        referenceId: booking.id,
        referenceType: 'lab_test_booking',
      })
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        type: 'lab_test',
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        ticketId: 'BK-' + booking.id.slice(0, 8).toUpperCase(),
      },
    })
  } catch (error) {
    console.error('POST /api/bookings/lab-test error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
