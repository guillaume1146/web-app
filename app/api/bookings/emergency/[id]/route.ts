import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { acceptBooking, denyBooking, cancelBooking } from '@/lib/booking-actions'
import { bookingActionSchema } from '@/lib/validations/api'
import { rateLimitPublic } from '@/lib/rate-limit'
import prisma from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import { transition, instanceRepo } from '@/lib/workflow'

/**
 * Verify that the caller is the assigned responder for a given emergency booking.
 * Returns the booking or null if ownership check fails.
 */
async function verifyResponderOwnership(bookingId: string, userId: string) {
  const responderProfile = await prisma.emergencyWorkerProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!responderProfile) return null

  const booking = await prisma.emergencyBooking.findUnique({
    where: { id: bookingId },
    include: { patient: { select: { userId: true } } },
  })
  if (!booking || booking.responderId !== responderProfile.id) return null

  return booking
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = bookingActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
  }
  const { action, reason } = parsed.data

  try {
    if (action === 'accept') {
      const result = await acceptBooking(id, 'emergency', auth.sub)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'cancel') {
      const result = await cancelBooking(id, 'emergency', auth.sub, reason)
      return NextResponse.json({ success: true, ...result })
    }

    if (action === 'deny') {
      await denyBooking(id, 'emergency', auth.sub)
      return NextResponse.json({ success: true })
    }

    if (action === 'en_route') {
      const booking = await verifyResponderOwnership(id, auth.sub)
      if (!booking) return NextResponse.json({ success: false, message: 'Booking not found or not assigned to you' }, { status: 404 })
      if (booking.status !== 'dispatched') {
        return NextResponse.json({ success: false, message: 'Booking must be in dispatched state' }, { status: 400 })
      }

      // Use workflow transition if instance exists
      const wfInstance = await instanceRepo.findInstanceByBooking(id, 'emergency_booking')
      if (wfInstance) {
        try {
          const result = await transition({
            instanceId: wfInstance.id,
            action: 'en_route',
            actionByUserId: auth.sub,
            actionByRole: 'provider',
          })
          return NextResponse.json({ success: true, data: result })
        } catch (err) {
          console.warn('Workflow transition for en_route failed, falling back to direct update:', err)
        }
      }

      // Fallback: direct DB update
      await prisma.emergencyBooking.update({
        where: { id },
        data: { status: 'en_route' },
      })

      await createNotification({
        userId: booking.patient.userId,
        type: 'emergency_update',
        title: 'Responder En Route',
        message: 'An emergency responder is on the way to your location.',
        referenceId: id,
        referenceType: 'emergency',
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'complete') {
      const booking = await verifyResponderOwnership(id, auth.sub)
      if (!booking) return NextResponse.json({ success: false, message: 'Booking not found or not assigned to you' }, { status: 404 })
      if (booking.status !== 'dispatched' && booking.status !== 'en_route') {
        return NextResponse.json({ success: false, message: 'Booking must be dispatched or en_route to complete' }, { status: 400 })
      }

      // Use workflow transition if instance exists — resolve through available path
      const wfInstance = await instanceRepo.findInstanceByBooking(id, 'emergency_booking')
      if (wfInstance) {
        try {
          // The workflow may be at various intermediate steps; try 'resolve' action
          const result = await transition({
            instanceId: wfInstance.id,
            action: 'resolve',
            actionByUserId: auth.sub,
            actionByRole: 'provider',
          })
          return NextResponse.json({ success: true, data: result })
        } catch {
          // May fail if not at 'stabilized' status — fall through to direct update
        }
      }

      // Fallback: direct DB update
      await prisma.emergencyBooking.update({
        where: { id },
        data: { status: 'resolved' },
      })

      await createNotification({
        userId: booking.patient.userId,
        type: 'emergency_update',
        title: 'Emergency Resolved',
        message: 'Your emergency service has been completed.',
        referenceId: id,
        referenceType: 'emergency',
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof Error) {
      const errorMap: Record<string, { message: string; status: number }> = {
        NOT_FOUND: { message: 'Booking not found', status: 404 },
        NOT_PENDING: { message: 'Booking is not pending', status: 400 },
        NOT_CANCELLABLE: { message: 'Booking cannot be cancelled in its current state', status: 400 },
        INSUFFICIENT_BALANCE: { message: 'Patient has insufficient wallet balance', status: 400 },
        WALLET_NOT_FOUND: { message: 'Patient wallet not found', status: 404 },
      }
      const mapped = errorMap[error.message]
      if (mapped) return NextResponse.json({ success: false, message: mapped.message }, { status: mapped.status })
    }
    console.error('PATCH /api/bookings/emergency/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
