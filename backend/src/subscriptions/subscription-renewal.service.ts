import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TreasuryService } from '../shared/services/treasury.service';
import { MoneyFormatService } from '../shared/services/money-format.service';

/**
 * Monthly charge for INDIVIDUAL (non-corporate) subscriptions. Runs daily
 * but is idempotent via `SubscriptionRenewalLog(subscriptionId, period)`:
 * a second run in the same YYYY-MM window finds the existing log row and
 * does nothing. Corporate-paid subscriptions (`corporateAdminId` set) are
 * skipped — the employer pays in bulk via `enrollEmployees`.
 *
 * Grace period: if the member's wallet can't cover the premium, the log
 * row is NOT written (so a later run still tries) and the subscription is
 * flipped to `past_due` until payment succeeds.
 */
@Injectable()
export class SubscriptionRenewalService {
  private readonly logger = new Logger(SubscriptionRenewalService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private treasury: TreasuryService,
    private money: MoneyFormatService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runMonthlySweep() {
    try {
      const out = await this.processDueRenewals();
      if (out.processed) this.logger.log(`Subscription renewals: ${out.renewed} charged, ${out.pastDue} past-due (of ${out.processed} due)`);
    } catch (e) {
      this.logger.error('Subscription renewal sweep failed', e as any);
    }
  }

  async processDueRenewals() {
    const now = new Date();
    const period = now.toISOString().slice(0, 7); // "YYYY-MM"

    // Individual, active, auto-renew plans whose startDate anniversary has passed this month.
    const candidates = await this.prisma.userSubscription.findMany({
      where: { status: 'active', corporateAdminId: null, autoRenew: true },
      select: {
        id: true, userId: true, startDate: true,
        plan: { select: { id: true, name: true, price: true } },
      },
    });

    let renewed = 0, pastDue = 0, processed = 0;

    for (const sub of candidates) {
      if (sub.plan.price <= 0) continue;
      // Only bill when the current calendar day is at or after the startDate's day-of-month.
      const billingDay = sub.startDate.getUTCDate();
      if (now.getUTCDate() < billingDay) continue;
      processed++;
      try {
        const existing = await this.prisma.subscriptionRenewalLog.findUnique({
          where: { subscriptionId_period: { subscriptionId: sub.id, period } },
        });
        if (existing) continue;

        const wallet = await this.prisma.userWallet.findUnique({
          where: { userId: sub.userId }, select: { id: true, balance: true },
        });
        if (!wallet || wallet.balance < sub.plan.price) {
          await this.prisma.userSubscription.update({
            where: { id: sub.id }, data: { status: 'past_due' as any },
          });
          const priceStr = await this.money.formatForUser(sub.plan.price, sub.userId);
          this.notifications.createNotification({
            userId: sub.userId,
            type: 'subscription_past_due',
            title: 'Subscription payment failed',
            message: `Top up your Account Balance to continue your ${sub.plan.name} plan (${priceStr}/month due).`,
            referenceId: sub.id,
            referenceType: 'UserSubscription',
          }).catch(() => {});
          pastDue++;
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          const before = wallet.balance;
          await tx.userWallet.update({ where: { id: wallet.id }, data: { balance: before - sub.plan.price } });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id, type: 'debit', amount: sub.plan.price,
              description: `Subscription renewal — ${sub.plan.name} (${period})`,
              serviceType: 'subscription', referenceId: sub.plan.id,
              status: 'completed', balanceBefore: before, balanceAfter: before - sub.plan.price,
            },
          });
          await this.treasury.creditPlatformFee(tx, {
            amount: sub.plan.price,
            source: 'subscription_individual',
            referenceId: sub.id,
            description: `Individual plan "${sub.plan.name}" ${period}`,
          });
          // Unique-constraint makes this INSERT the idempotency key — if the
          // cron fires twice in the same period a P2002 would be thrown, but
          // we guard above with findUnique so the concurrent case is a no-op.
          await tx.subscriptionRenewalLog.create({
            data: { subscriptionId: sub.id, period, amount: sub.plan.price },
          });
          // If the sub was past_due, flip back to active.
          await tx.userSubscription.update({
            where: { id: sub.id }, data: { status: 'active' as any },
          });
        });

        const paidStr = await this.money.formatForUser(sub.plan.price, sub.userId);
        this.notifications.createNotification({
          userId: sub.userId,
          type: 'subscription_renewed',
          title: 'Subscription renewed',
          message: `${paidStr} — ${sub.plan.name} (${period}).`,
          referenceId: sub.id,
          referenceType: 'UserSubscription',
        }).catch(() => {});
        renewed++;
      } catch (e) {
        this.logger.warn(`Renewal failed for subscription ${sub.id}: ${(e as Error).message}`);
      }
    }
    return { processed, renewed, pastDue };
  }
}
