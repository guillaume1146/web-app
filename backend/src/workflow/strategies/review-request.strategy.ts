import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types';

@Injectable()
export class ReviewRequestStrategy implements StepFlagHandler {
  flag = 'triggers_review_request' as const;
  constructor(private notifications: NotificationsService) {}

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    await this.notifications.createNotification({
      userId: ctx.patientUserId, type: 'review_request',
      title: 'How was your experience?',
      message: 'Your session is complete. Please take a moment to leave a review.',
      referenceId: ctx.bookingId, referenceType: ctx.bookingType,
    });
    return { reviewRequestSent: true };
  }
}
