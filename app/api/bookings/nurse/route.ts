import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { createNotification } from '@/lib/notifications'
import { createNurseBookingSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'
import { validateSlotAvailability } from '@/lib/booking/validate-availability'
import { checkBookingCost } from '@/lib/booking/check-balance'
import { ensurePatientProfile } from '@/lib/bookings/ensure-patient-profile'

const DEFAULT_NURSE_FEE = 500 // Fallback when no service price specified

export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createNurseBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { nurseId, consultationType, scheduledDate, scheduledTime, reason, notes, duration } = parsed.data
    const serviceName = body.serviceName as string | undefined
    const servicePrice = body.servicePrice != null ? Number(body.servicePrice) : undefined

    // Validate nurse exists (keeping existing check below)
    if (!nurseId || typeof nurseId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Nurse ID is required' },
        { status: 400 }
      )
    }

    if (!consultationType || !['in_person', 'home_visit', 'video'].includes(consultationType)) {
      return NextResponse.json(
        { success: false, message: 'Consultation type must be in_person, home_visit, or video' },
        { status: 400 }
      )
    }

    if (!scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { success: false, message: 'Scheduled date and time are required' },
        { status: 400 }
      )
    }

    // Find or auto-create patient profile (any user type can book a nurse)
    const patientProfile = await ensurePatientProfile(auth.sub)

    // Look up nurse profile (try profile ID first, then user ID)
    let nurseProfile = await prisma.nurseProfile.findUnique({
      where: { id: nurseId },
      select: { id: true, userId: true },
    })
    if (!nurseProfile) {
      nurseProfile = await prisma.nurseProfile.findFirst({
        where: { userId: nurseId },
        select: { id: true, userId: true },
      })
    }

    if (!nurseProfile) {
      return NextResponse.json(
        { success: false, message: 'Nurse profile not found' },
        { status: 404 }
      )
    }

    // Check patient wallet balance with subscription benefits
    const bookingFee = servicePrice ?? DEFAULT_NURSE_FEE
    const costCheck = await checkBookingCost({
      patientUserId: auth.sub,
      baseFee: bookingFee,
      consultType: 'nurse',
      serviceType: 'nurse',
    })
    if (!costCheck.sufficient) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient balance. You need ${costCheck.adjustedFee} but only have ${costCheck.balance?.toFixed(2) ?? '0'}. Please top up your wallet.`,
          costBreakdown: {
            originalFee: bookingFee,
            adjustedFee: costCheck.adjustedFee,
            discount: costCheck.discount,
            coveredBySubscription: costCheck.coveredBySubscription,
          },
        },
        { status: 400 }
      )
    }

    // Validate slot availability (provider settings + no conflicting bookings)
    const slotCheck = await validateSlotAvailability(nurseProfile.id, 'nurse', scheduledDate, scheduledTime)
    if (!slotCheck.available) {
      return NextResponse.json(
        { success: false, message: slotCheck.reason },
        { status: 409 }
      )
    }

    // Combine date and time
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

    // Create booking with pending status (no wallet debit — happens on provider approval)
    const booking = await prisma.nurseBooking.create({
      data: {
        patientId: patientProfile.id,
        nurseId: nurseProfile.id,
        scheduledAt,
        duration: duration || 60,
        type: consultationType,
        reason: reason?.trim() || null,
        notes: notes?.trim() || null,
        serviceName: serviceName || null,
        servicePrice: servicePrice ?? null,
        status: 'pending',
      },
      select: {
        id: true,
        type: true,
        scheduledAt: true,
        status: true,
      },
    })

    // Get patient name for notification
    const patientUser = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { firstName: true, lastName: true },
    })

    await createNotification({
      userId: nurseProfile.userId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `${patientUser?.firstName} ${patientUser?.lastName} has requested a ${consultationType.replace('_', ' ')} nurse visit on ${scheduledDate} at ${scheduledTime}`,
      referenceId: booking.id,
      referenceType: 'nurse_booking',
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        type: booking.type,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        ticketId: 'BK-' + booking.id.slice(0, 8).toUpperCase(),
      },
    })
  } catch (error) {
    console.error('POST /api/bookings/nurse error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
