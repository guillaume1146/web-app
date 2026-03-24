import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { createNotification } from '@/lib/notifications'
import { createServiceBookingSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'
import { checkBookingCost } from '@/lib/booking/check-balance'
import { ensurePatientProfile } from '@/lib/bookings/ensure-patient-profile'
import { attachWorkflow } from '@/lib/workflow/hook'

const DEFAULT_FEES: Record<string, number> = {
  CAREGIVER: 600,
  PHYSIOTHERAPIST: 800,
  DENTIST: 800,
  OPTOMETRIST: 800,
  NUTRITIONIST: 1000,
}

/**
 * POST /api/bookings/service
 * Generic booking for new provider roles: caregiver, physiotherapist, dentist, optometrist, nutritionist.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createServiceBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { providerUserId, providerType, scheduledDate, scheduledTime, type, reason, notes, duration, serviceName, servicePrice, specialty } = parsed.data

    // Verify provider exists
    const provider = await prisma.user.findUnique({
      where: { id: providerUserId },
      select: { id: true, firstName: true, lastName: true, userType: true },
    })

    if (!provider || provider.userType !== providerType) {
      return NextResponse.json({ success: false, message: 'Provider not found' }, { status: 404 })
    }

    // Ensure patient profile
    await ensurePatientProfile(auth.sub)

    // Check wallet balance with subscription benefits
    const fee = servicePrice ?? DEFAULT_FEES[providerType] ?? 500
    const costCheck = await checkBookingCost({
      patientUserId: auth.sub,
      baseFee: fee,
      provider: { role: providerType, specialty: specialty || undefined },
      serviceType: providerType.toLowerCase(),
    })

    if (!costCheck.sufficient) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient balance. You need ${costCheck.adjustedFee} but only have ${costCheck.balance?.toFixed(2) ?? '0'}.`,
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

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)

    const booking = await prisma.serviceBooking.create({
      data: {
        patientId: auth.sub,
        providerUserId,
        providerType,
        providerName: `${provider.firstName} ${provider.lastName}`,
        scheduledAt,
        duration: duration || 30,
        type,
        status: 'pending',
        reason: reason?.trim() || null,
        notes: notes?.trim() || null,
        serviceName: serviceName || null,
        servicePrice: costCheck.adjustedFee,
        specialty: specialty || null,
      },
      select: {
        id: true,
        providerType: true,
        scheduledAt: true,
        status: true,
      },
    })

    // Attach workflow instance
    await attachWorkflow({
      bookingId: booking.id,
      bookingRoute: 'service',
      patientUserId: auth.sub,
      providerUserId,
      providerType,
      consultationType: type,
      servicePrice: costCheck.adjustedFee,
    })

    // Notify provider
    const patientUser = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { firstName: true, lastName: true },
    })

    await createNotification({
      userId: providerUserId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `${patientUser?.firstName} ${patientUser?.lastName} has requested a ${type.replace('_', ' ')} ${providerType.toLowerCase()} session on ${scheduledDate} at ${scheduledTime}`,
      referenceId: booking.id,
      referenceType: 'service_booking',
    })

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        type: booking.providerType,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        ticketId: 'BK-' + booking.id.slice(0, 8).toUpperCase(),
      },
    })
  } catch (error) {
    console.error('POST /api/bookings/service error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/bookings/service
 * List service bookings for the current user (as patient or provider).
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'patient' or 'provider'

    const where = role === 'provider'
      ? { providerUserId: auth.sub }
      : { patientId: auth.sub }

    const bookings = await prisma.serviceBooking.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, data: bookings })
  } catch (error) {
    console.error('GET /api/bookings/service error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/bookings/service
 * Update a service booking status. Provider can: accept → in_progress → completed.
 * Body: { bookingId: string, status: string, notes?: string }
 */
export async function PATCH(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { bookingId, status, notes } = body as { bookingId: string; status: string; notes?: string }

    if (!bookingId || !status) {
      return NextResponse.json({ success: false, message: 'bookingId and status required' }, { status: 400 })
    }

    const validStatuses = ['accepted', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: `Invalid status. Must be: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const booking = await prisma.serviceBooking.findUnique({ where: { id: bookingId } })
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }

    // Verify ownership — provider or patient can update
    if (booking.providerUserId !== auth.sub && booking.patientId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    // Patients can only cancel
    if (booking.patientId === auth.sub && status !== 'cancelled') {
      return NextResponse.json({ success: false, message: 'Patients can only cancel bookings' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = { status }
    if (notes) updateData.notes = notes

    const updated = await prisma.serviceBooking.update({
      where: { id: bookingId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/bookings/service error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
