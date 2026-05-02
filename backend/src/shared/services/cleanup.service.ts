import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Background jobs that keep the system tidy:
 *   - Stale booking cleanup (hourly)      — cancel unaccepted bookings older than 48h
 *   - Subscription expiry pass (daily 4am) — flip ended subs to 'expired' + notify
 *   - Subscription renewal reminders (daily 4am) — 7d / 3d / 1d
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Stale bookings — cancel if still pending after 48h ────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async cancelStaleBookings() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    try {
      const stale = await this.prisma.serviceBooking.findMany({
        where: { status: 'pending', createdAt: { lt: cutoff } },
        select: { id: true, patientId: true, providerUserId: true, serviceName: true },
      });
      if (stale.length === 0) return;

      for (const b of stale) {
        await this.prisma.serviceBooking.update({
          where: { id: b.id },
          data: { status: 'cancelled' },
        });
        // Keep the WorkflowInstance aligned if one exists
        await this.prisma.workflowInstance.updateMany({
          where: { bookingId: b.id, currentStatus: 'pending' },
          data: { currentStatus: 'cancelled' },
        }).catch(() => {});

        // Notify both parties — non-fatal
        for (const uid of [b.patientId, b.providerUserId].filter(Boolean) as string[]) {
          this.notifications.createNotification({
            userId: uid,
            type: 'booking',
            title: 'Booking cancelled',
            message: `${b.serviceName || 'Your booking'} was auto-cancelled after 48h without acceptance.`,
            referenceId: b.id,
            referenceType: 'ServiceBooking',
          }).catch(() => {});
        }
      }
      this.logger.log(`Stale-booking cleanup: cancelled ${stale.length} pending bookings`);
    } catch (err) {
      this.logger.warn(`Stale-booking cleanup failed: ${(err as Error).message}`);
    }
  }

  // ─── Subscription expiry + reminders (daily, 04:00) ────────────────────
  @Cron('0 0 4 * * *')
  async processSubscriptions() {
    const now = new Date();

    try {
      // 1. Mark subscriptions with endDate passed as 'expired' + notify the buyer.
      const expiring = await this.prisma.userSubscription.findMany({
        where: { status: 'active', endDate: { lte: now } },
        select: { id: true, userId: true, plan: { select: { name: true } } },
      });
      for (const sub of expiring) {
        await this.prisma.userSubscription.update({
          where: { id: sub.id },
          data: { status: 'expired' },
        });
        this.notifications.createNotification({
          userId: sub.userId,
          type: 'subscription',
          title: 'Subscription expired',
          message: `Your ${sub.plan?.name ?? 'subscription'} has ended. Renew to keep your benefits.`,
          referenceId: sub.id,
          referenceType: 'UserSubscription',
        }).catch(() => {});
      }
      if (expiring.length) this.logger.log(`Expired ${expiring.length} subscriptions`);

      // 2. Renewal reminders at 7/3/1 days out. Emit one notification per threshold
      //    — naive dedupe: only fires when endDate falls exactly in the target window.
      const reminders = [
        { days: 7, title: 'Subscription expires in 7 days' },
        { days: 3, title: 'Subscription expires in 3 days' },
        { days: 1, title: 'Subscription expires tomorrow' },
      ];
      for (const r of reminders) {
        const start = new Date(now.getTime() + r.days * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

        const subs = await this.prisma.userSubscription.findMany({
          where: { status: 'active', endDate: { gte: start, lt: end } },
          select: { id: true, userId: true, plan: { select: { name: true } } },
        });
        for (const sub of subs) {
          this.notifications.createNotification({
            userId: sub.userId,
            type: 'subscription',
            title: r.title,
            message: `Renew ${sub.plan?.name ?? 'your subscription'} to keep benefits active.`,
            referenceId: sub.id,
            referenceType: 'UserSubscription',
          }).catch(() => {});
        }
      }
    } catch (err) {
      this.logger.warn(`Subscription cron failed: ${(err as Error).message}`);
    }
  }
}
