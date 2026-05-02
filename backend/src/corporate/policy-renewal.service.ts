import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TreasuryService } from '../shared/services/treasury.service';
import { MoneyFormatService } from '../shared/services/money-format.service';
import { PreAuthorizationService } from './pre-authorization.service';

/**
 * Monthly insurance policy renewals — runs daily, processes any policy whose
 * `renewsAt` has passed. Money flow uses Health Credit end-to-end:
 *
 *   member wallet  --debit premium-->  company treasury  (platform fee cut)
 *
 * Grace period: if the member's wallet can't cover the premium, the policy
 * stays `active` but `renewsAt` does NOT advance. After `GRACE_DAYS` past
 * the original due date the policy is marked `lapsed` and the member is
 * notified. Claims submitted while lapsed are rejected by the reimbursement
 * rules (waiting-period / no-active-policy handling lives in the rules
 * engine, not here).
 *
 * Annual limits reset at the `startDate` anniversary: `ytdClaimsPaid` and
 * `deductibleUsed` zero out and `ytdResetAt` moves forward.
 */
@Injectable()
export class PolicyRenewalService {
  private readonly logger = new Logger(PolicyRenewalService.name);
  private static readonly GRACE_DAYS = 7;
  private static readonly RENEWAL_INTERVAL_DAYS = 30;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private treasury: TreasuryService,
    private preAuth: PreAuthorizationService,
    private money: MoneyFormatService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyRenewalSweep() {
    try {
      await this.processRenewals();
      await this.processAnnualResets();
      const expired = await this.preAuth.expireStale();
      if (expired) this.logger.log(`Pre-auth expiry sweep: ${expired} flipped to expired`);
    } catch (e) {
      this.logger.error('Policy renewal sweep failed', e as any);
    }
  }

  /** Public entry point so an admin endpoint or test can trigger the sweep on demand. */
  async processRenewals() {
    const now = new Date();
    const graceCutoff = new Date(now.getTime() - PolicyRenewalService.GRACE_DAYS * 24 * 3600e3);

    const due = await this.prisma.insurancePolicy.findMany({
      where: { status: 'active', renewsAt: { lte: now } },
      select: {
        id: true, memberId: true, renewsAt: true, planId: true,
        plan: { select: { id: true, name: true, monthlyContribution: true, companyProfileId: true } },
      },
    });

    let renewed = 0, lapsed = 0, failed = 0;

    for (const policy of due) {
      if (policy.renewsAt < graceCutoff) {
        await this.lapsePolicy(policy.id, policy.memberId, policy.plan.name);
        lapsed++;
        continue;
      }
      try {
        const ok = await this.tryRenew(policy);
        if (ok) renewed++; else failed++;
      } catch (e) {
        this.logger.error(`Renewal failed for policy ${policy.id}`, e as any);
        failed++;
      }
    }

    if (due.length) {
      this.logger.log(`Renewal sweep: ${renewed} renewed, ${failed} in grace, ${lapsed} lapsed (of ${due.length} due)`);
    }
    return { processed: due.length, renewed, lapsed, failed };
  }

  private async tryRenew(policy: {
    id: string; memberId: string; renewsAt: Date; planId: string;
    plan: { id: string; name: string; monthlyContribution: number; companyProfileId: string };
  }): Promise<boolean> {
    const premium = policy.plan.monthlyContribution;
    const period = policy.renewsAt.toISOString().slice(0, 7); // "YYYY-MM"

    // Idempotency: if we already charged this policy for this period, bail.
    // Defends against clustered deploys firing the cron from two nodes.
    const existing = await this.prisma.policyRenewalLog.findUnique({
      where: { policyId_period: { policyId: policy.id, period } },
    });
    if (existing) return true;

    if (premium <= 0) {
      // Free plan — just advance the date.
      await this.prisma.insurancePolicy.update({
        where: { id: policy.id },
        data: { renewsAt: this.addDays(policy.renewsAt, PolicyRenewalService.RENEWAL_INTERVAL_DAYS) },
      });
      return true;
    }

    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId: policy.memberId },
      select: { id: true, balance: true },
    });
    if (!wallet || wallet.balance < premium) {
      // Insufficient funds — leave renewsAt unchanged so the sweep retries tomorrow.
      await this.notifyInsufficientFunds(policy.memberId, policy.plan.name, premium, wallet?.balance ?? 0);
      return false;
    }

    await this.prisma.$transaction(async (tx) => {
      // Debit member wallet.
      await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: premium } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'debit',
          amount: premium,
          description: `Insurance premium — ${policy.plan.name}`,
          status: 'completed',
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance - premium,
        },
      });

      // Credit company treasury minus platform fee.
      await this.treasury.creditContribution(tx, {
        companyProfileId: policy.plan.companyProfileId,
        memberId: policy.memberId,
        amount: premium,
        description: `Auto-renewal premium — ${policy.plan.name}`,
      });

      // Write the idempotency row BEFORE advancing the date. If this INSERT
      // races with another cron node, the unique constraint throws — the
      // outer tx unwinds and the wallet / treasury writes are rolled back.
      await tx.policyRenewalLog.create({
        data: { policyId: policy.id, period, amount: premium },
      });

      // Advance the renewal date.
      await tx.insurancePolicy.update({
        where: { id: policy.id },
        data: { renewsAt: this.addDays(policy.renewsAt, PolicyRenewalService.RENEWAL_INTERVAL_DAYS) },
      });
    });

    const premiumStr = await this.money.formatForUser(premium, policy.memberId);
    this.notifications.createNotification({
      userId: policy.memberId,
      type: 'insurance_renewal',
      title: 'Insurance premium paid',
      message: `${premiumStr} — ${policy.plan.name}. Your coverage continues.`,
      referenceId: policy.id,
      referenceType: 'InsurancePolicy',
      groupKey: `policy:${policy.id}`,
    }).catch(() => {});
    return true;
  }

  private async lapsePolicy(policyId: string, memberId: string, planName: string) {
    await this.prisma.insurancePolicy.update({
      where: { id: policyId },
      data: { status: 'lapsed' },
    });
    this.notifications.createNotification({
      userId: memberId,
      type: 'insurance_lapsed',
      title: 'Insurance policy lapsed',
      message: `Your ${planName} policy lapsed after the ${PolicyRenewalService.GRACE_DAYS}-day grace period. Top up your wallet and re-enroll to restore coverage.`,
      referenceId: policyId,
      referenceType: 'InsurancePolicy',
      groupKey: `policy:${policyId}`,
    }).catch(() => {});
  }

  private async notifyInsufficientFunds(memberId: string, planName: string, needed: number, have: number) {
    const [needStr, haveStr] = await Promise.all([
      this.money.formatForUser(needed, memberId),
      this.money.formatForUser(have, memberId),
    ]);
    this.notifications.createNotification({
      userId: memberId,
      type: 'insurance_grace',
      title: 'Insurance premium due',
      message: `Your ${planName} premium (${needStr}) is due. Account Balance has ${haveStr}. You have ${PolicyRenewalService.GRACE_DAYS} days to top up before the policy lapses.`,
      groupKey: `policy-grace:${memberId}`,
    }).catch(() => {});
  }

  /**
   * Annual reset: at the start-date anniversary (`ytdResetAt + 365d`), zero
   * out accumulated claim totals so the annual ceiling + deductible apply
   * fresh for the next policy year.
   */
  async processAnnualResets() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 365 * 24 * 3600e3);
    const toReset = await this.prisma.insurancePolicy.findMany({
      where: { status: 'active', ytdResetAt: { lte: cutoff } },
      select: { id: true, memberId: true, plan: { select: { name: true } } },
    });
    for (const p of toReset) {
      await this.prisma.insurancePolicy.update({
        where: { id: p.id },
        data: { ytdClaimsPaid: 0, deductibleUsed: 0, ytdResetAt: now },
      });
      this.notifications.createNotification({
        userId: p.memberId,
        type: 'insurance_year_reset',
        title: 'New policy year',
        message: `Your ${p.plan.name} annual limits have reset. You have a full year of coverage ahead.`,
        referenceId: p.id,
        referenceType: 'InsurancePolicy',
      }).catch(() => {});
    }
    if (toReset.length) this.logger.log(`Annual reset: ${toReset.length} policies rolled over`);
  }

  private addDays(d: Date, n: number): Date {
    return new Date(d.getTime() + n * 24 * 3600e3);
  }
}
