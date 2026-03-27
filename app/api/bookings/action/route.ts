import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { processServicePayment } from '@/lib/commission'
import { createNotification } from '@/lib/notifications'
import { rateLimitPublic } from '@/lib/rate-limit'
import { resolveAndConfirmBooking, resolveAndDenyBooking } from '@/lib/bookings/resolve-booking'
import { attachWorkflow } from '@/lib/workflow/hook'
import { transition } from '@/lib/workflow'
import { z } from 'zod'

const actionSchema = z.object({
  bookingId: z.string().min(1),
  bookingType: z.enum(['doctor', 'nurse', 'nanny', 'lab_test', 'emergency', 'service']),
  action: z.enum(['accept', 'deny']),
})

/**
 * POST /api/bookings/action
 * Unified accept/deny endpoint for all booking types.
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
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { bookingId, bookingType, action } = parsed.data

    if (action === 'deny') {
      const denyResult = await resolveAndDenyBooking(bookingId, bookingType, auth.sub)
      if (denyResult.error) {
        return NextResponse.json({ success: false, message: denyResult.error.message }, { status: denyResult.error.status })
      }
      if (denyResult.patientUserId) {
        await createNotification({
          userId: denyResult.patientUserId,
          type: 'booking_declined',
          title: 'Booking Declined',
          message: `Your ${denyResult.description} request has been declined by the provider.`,
          referenceId: bookingId,
          referenceType: bookingType === 'doctor' ? 'appointment' : `${bookingType}_booking`,
        })
      }
      return NextResponse.json({ success: true, message: 'Booking declined' })
    }

    // Accept flow — emergency has special handling
    if (bookingType === 'emergency') {
      const responderProfile = await prisma.emergencyWorkerProfile.findUnique({
        where: { userId: auth.sub },
        select: { id: true },
      })
      if (!responderProfile) {
        return NextResponse.json({ success: false, message: 'Responder profile not found' }, { status: 404 })
      }
      const booking = await prisma.emergencyBooking.findUnique({
        where: { id: bookingId },
        include: { patient: { select: { userId: true } } },
      })
      if (!booking) {
        return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
      }
      await prisma.emergencyBooking.update({
        where: { id: bookingId },
        data: { status: 'dispatched', responderId: responderProfile.id },
      })

      // Attach workflow (creates instance at 'pending') then transition to 'dispatched'
      // Workflow handles: conversation creation (triggers_conversation) + patient notification
      const wf = await attachWorkflow({
        bookingId,
        bookingRoute: 'emergency',
        patientUserId: booking.patient.userId,
        providerUserId: auth.sub,
        providerType: 'EMERGENCY_WORKER',
        consultationType: 'home_visit',
      })

      if (wf.workflowInstanceId) {
        try {
          await transition({
            instanceId: wf.workflowInstanceId,
            action: 'accept',
            actionByUserId: auth.sub,
            actionByRole: 'provider',
          })
        } catch (err) {
          console.warn('Emergency workflow transition to dispatched failed:', err)
        }
      } else {
        // Fallback: manual conversation + notification if workflow not available
        try {
          const existing = await prisma.conversation.findFirst({
            where: {
              type: 'direct',
              AND: [
                { participants: { some: { userId: auth.sub } } },
                { participants: { some: { userId: booking.patient.userId } } },
              ],
            },
          })
          if (!existing) {
            await prisma.conversation.create({
              data: {
                type: 'direct',
                participants: { create: [{ userId: auth.sub }, { userId: booking.patient.userId }] },
              },
            })
          }
        } catch { /* conversation creation is best-effort */ }

        await createNotification({
          userId: booking.patient.userId,
          type: 'booking_confirmed',
          title: 'Emergency Responder Dispatched',
          message: 'An emergency responder has been dispatched to your location.',
          referenceId: bookingId,
          referenceType: 'emergency_booking',
        })
      }

      return NextResponse.json({ success: true, message: 'Emergency booking accepted — responder dispatched' })
    }

    // Standard accept flow using shared resolver
    const result = await resolveAndConfirmBooking(bookingId, bookingType, auth.sub)
    if (result.error) {
      return NextResponse.json({ success: false, message: result.error.message }, { status: result.error.status })
    }

    const { patientUserId, amount, description, serviceType } = result.data!

    const paymentResult = await processServicePayment({
      patientUserId,
      providerUserId: result.data!.providerUserId,
      amount,
      description,
      serviceType,
      referenceId: bookingId,
    })

    if (!paymentResult.success) {
      if (paymentResult.error === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ success: false, message: 'Patient has insufficient balance' }, { status: 400 })
      }
      if (paymentResult.error === 'WALLET_NOT_FOUND') {
        return NextResponse.json({ success: false, message: 'Patient wallet not found' }, { status: 400 })
      }
      return NextResponse.json({ success: false, message: 'Payment processing failed' }, { status: 500 })
    }

    await createNotification({
      userId: patientUserId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: `Your ${description} has been confirmed. Rs ${amount} has been charged.`,
      referenceId: bookingId,
      referenceType: bookingType === 'doctor' ? 'appointment' : `${bookingType}_booking`,
    })

    return NextResponse.json({
      success: true,
      message: 'Booking confirmed and payment processed',
      data: { amount, description },
    })
  } catch (error) {
    console.error('POST /api/bookings/action error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
