import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { createNotification } from '@/lib/notifications'
import { randomUUID } from 'crypto'
import { createDoctorBookingSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'
import { validateSlotAvailability } from '@/lib/booking/validate-availability'
import { checkBookingCost } from '@/lib/booking/check-balance'
import { ensurePatientProfile } from '@/lib/bookings/ensure-patient-profile'

export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createDoctorBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { doctorId, consultationType, scheduledDate, scheduledTime, reason, notes, duration } = parsed.data
    const serviceName = body.serviceName as string | undefined
    const servicePrice = body.servicePrice != null ? Number(body.servicePrice) : undefined

    // Find or auto-create patient profile (any user type can book a doctor)
    const patientProfile = await ensurePatientProfile(auth.sub)

    // Look up doctor profile (try profile ID first, then user ID)
    let doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      select: { id: true, userId: true, specialty: true, location: true, consultationFee: true, videoConsultationFee: true },
    })
    if (!doctorProfile) {
      doctorProfile = await prisma.doctorProfile.findFirst({
        where: { userId: doctorId },
        select: { id: true, userId: true, specialty: true, location: true, consultationFee: true, videoConsultationFee: true },
      })
    }

    if (!doctorProfile) {
      return NextResponse.json(
        { success: false, message: 'Doctor profile not found' },
        { status: 404 }
      )
    }

    // Check patient wallet balance with subscription benefits
    const fee = servicePrice
      ?? (consultationType === 'video' ? doctorProfile.videoConsultationFee : doctorProfile.consultationFee)
    // Determine provider for subscription quota check
    const providerSpec = doctorProfile.specialty?.[0] || 'General Practice'
    const costCheck = await checkBookingCost({
      patientUserId: auth.sub,
      baseFee: fee,
      provider: { role: 'DOCTOR', specialty: providerSpec },
      serviceType: providerSpec.toLowerCase().includes('general') ? 'gp' : 'specialist',
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
            discountPercent: costCheck.discountPercent,
            coveredBySubscription: costCheck.coveredBySubscription,
          },
        },
        { status: 400 }
      )
    }

    // Validate slot availability (provider settings + no conflicting bookings)
    const slotCheck = await validateSlotAvailability(doctorProfile.id, 'doctor', scheduledDate, scheduledTime)
    if (!slotCheck.available) {
      return NextResponse.json(
        { success: false, message: slotCheck.reason },
        { status: 409 }
      )
    }

    // Determine location
    const location = consultationType === 'in_person'
      ? doctorProfile.location
      : consultationType === 'home_visit'
        ? 'Patient Home'
        : null

    // Generate roomId for video consultations
    const roomId = consultationType === 'video' ? randomUUID() : null

    // Combine date and time
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

    // Create booking with pending status (no wallet debit — happens on provider approval)
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        scheduledAt,
        type: consultationType,
        status: 'pending',
        specialty: doctorProfile.specialty[0] || 'General',
        reason: reason?.trim() || '',
        duration: duration || 30,
        location,
        roomId,
        notes: notes?.trim() || null,
        serviceName: serviceName || null,
        servicePrice: costCheck.adjustedFee,
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
      userId: doctorProfile.userId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `${patientUser?.firstName} ${patientUser?.lastName} has requested a ${consultationType.replace('_', ' ')} consultation on ${scheduledDate} at ${scheduledTime}`,
      referenceId: appointment.id,
      referenceType: 'appointment',
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: appointment.id,
        type: appointment.type,
        scheduledAt: appointment.scheduledAt,
        status: appointment.status,
        ticketId: 'BK-' + appointment.id.slice(0, 8).toUpperCase(),
      },
    })
  } catch (error) {
    console.error('POST /api/bookings/doctor error:', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
