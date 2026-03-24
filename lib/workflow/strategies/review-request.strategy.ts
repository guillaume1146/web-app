/**
 * Review Request Strategy — sends a "leave a review" notification after completion.
 */
import { createNotification } from '@/lib/notifications'
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types'

export class ReviewRequestStrategy implements StepFlagHandler {
  flag = 'triggers_review_request' as const

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    await createNotification({
      userId: ctx.patientUserId,
      type: 'review_request',
      title: 'How was your experience?',
      message: 'Your session is complete. Please take a moment to leave a review.',
      referenceId: ctx.bookingId,
      referenceType: ctx.bookingType,
    })

    return { reviewRequestSent: true }
  }
}
