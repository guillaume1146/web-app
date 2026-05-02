import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Nightly audit: for every wallet and every treasury, verify the invariant
 *
 *     sum(ledger amounts, signed) === current balance
 *
 * If the sum drifts from the balance, somewhere in the codebase a write
 * skipped the ledger (or wrote a wrong `balanceBefore` / `balanceAfter`).
 * This is the single most important safeguard before MCB Juice — once real
 * money flows through the same ledger, a silent drift becomes real lost
 * cash that can't be recovered by a DB refresh.
 *
 * Behaviour on drift:
 *   - Log an error with the offending wallet / treasury id + delta.
 *   - Emit a `Notification` to every REGIONAL_ADMIN so finance + ops see it
 *     at the top of their inbox.
 *   - Never auto-fix the balance. The fix MUST be a compensating ledger row
 *     written with context, not a silent overwrite.
 */
@Injectable()
export class LedgerReconciliationService {
  private readonly logger = new Logger(LedgerReconciliationService.name);
  /** Floating-point slop tolerance (HC → MUR). */
  private static readonly EPSILON = 0.01;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async runNightlySweep() {
    try {
      const out = await this.reconcile();
      if (out.walletDrifts.length || out.treasuryDrifts.length || out.platformDrift) {
        await this.notifyAdmins(out);
      }
      this.logger.log(
        `Reconciliation: wallets checked=${out.walletsChecked} drift=${out.walletDrifts.length}, ` +
        `treasuries checked=${out.treasuriesChecked} drift=${out.treasuryDrifts.length}, ` +
        `platform drift=${out.platformDrift ? 'YES' : 'no'}`,
      );
    } catch (e) {
      this.logger.error('Ledger reconciliation failed', e as any);
    }
  }

  /** Public entry point so admins + integration tests can trigger on-demand. */
  async reconcile() {
    const [walletDrifts, walletsChecked] = await this.checkWallets();
    const [treasuryDrifts, treasuriesChecked] = await this.checkCompanyTreasuries();
    const platformDrift = await this.checkPlatformTreasury();
    return { walletDrifts, walletsChecked, treasuryDrifts, treasuriesChecked, platformDrift };
  }

  private async checkWallets() {
    const wallets = await this.prisma.userWallet.findMany({
      select: { id: true, userId: true, balance: true },
    });
    const drifts: Array<{ walletId: string; userId: string; balance: number; ledgerSum: number; delta: number }> = [];

    for (const w of wallets) {
      // Only completed transactions contribute — pending top-ups shouldn't
      // move balance yet. Debits are negative, credits positive.
      const [credits, debits] = await Promise.all([
        this.prisma.walletTransaction.aggregate({
          where: { walletId: w.id, status: 'completed', type: 'credit' },
          _sum: { amount: true },
        }),
        this.prisma.walletTransaction.aggregate({
          where: { walletId: w.id, status: 'completed', type: 'debit' },
          _sum: { amount: true },
        }),
      ]);
      const ledgerSum = (credits._sum.amount ?? 0) - (debits._sum.amount ?? 0);
      const delta = w.balance - ledgerSum;
      if (Math.abs(delta) > LedgerReconciliationService.EPSILON) {
        drifts.push({ walletId: w.id, userId: w.userId, balance: w.balance, ledgerSum, delta });
        this.logger.error(
          `Wallet drift ${w.id} (user ${w.userId}): balance=${w.balance.toFixed(2)} ledger=${ledgerSum.toFixed(2)} delta=${delta.toFixed(2)}`,
        );
      }
    }
    return [drifts, wallets.length] as const;
  }

  private async checkCompanyTreasuries() {
    const treasuries = await this.prisma.insuranceCompanyTreasury.findMany({
      select: { id: true, companyProfileId: true, balance: true },
    });
    const drifts: Array<{ treasuryId: string; companyProfileId: string; balance: number; ledgerSum: number; delta: number }> = [];

    for (const t of treasuries) {
      // Company treasury ledger rows: contribution (inflow +) and claim_payout /
      // direct_billing (outflow -). `platform_fee` marker rows on the company's
      // own ledger are deliberately balanceBefore === balanceAfter, so they
      // must be excluded from the sum.
      const inflows = await this.prisma.treasuryTransaction.aggregate({
        where: { treasuryId: t.id, type: 'contribution' },
        _sum: { amount: true },
      });
      const outflows = await this.prisma.treasuryTransaction.aggregate({
        where: { treasuryId: t.id, type: { in: ['claim_payout', 'direct_billing'] } },
        _sum: { amount: true },
      });
      const ledgerSum = (inflows._sum.amount ?? 0) - (outflows._sum.amount ?? 0);
      const delta = t.balance - ledgerSum;
      if (Math.abs(delta) > LedgerReconciliationService.EPSILON) {
        drifts.push({ treasuryId: t.id, companyProfileId: t.companyProfileId, balance: t.balance, ledgerSum, delta });
        this.logger.error(
          `Company treasury drift ${t.id}: balance=${t.balance.toFixed(2)} ledger=${ledgerSum.toFixed(2)} delta=${delta.toFixed(2)}`,
        );
      }
    }
    return [drifts, treasuries.length] as const;
  }

  private async checkPlatformTreasury(): Promise<null | { balance: number; ledgerSum: number; delta: number }> {
    const platform = await this.prisma.platformTreasury.findFirst();
    if (!platform) return null;
    // PlatformTreasury rows are written to the SAME TreasuryTransaction table,
    // but with `treasuryId = platform.id` and `type = 'platform_fee'`.
    const agg = await this.prisma.treasuryTransaction.aggregate({
      where: { treasuryId: platform.id, type: 'platform_fee' },
      _sum: { amount: true },
    });
    const ledgerSum = agg._sum.amount ?? 0;
    const delta = platform.balance - ledgerSum;
    if (Math.abs(delta) > LedgerReconciliationService.EPSILON) {
      this.logger.error(
        `Platform treasury drift: balance=${platform.balance.toFixed(2)} ledger=${ledgerSum.toFixed(2)} delta=${delta.toFixed(2)}`,
      );
      return { balance: platform.balance, ledgerSum, delta };
    }
    return null;
  }

  private async notifyAdmins(result: Awaited<ReturnType<LedgerReconciliationService['reconcile']>>) {
    const admins = await this.prisma.user.findMany({
      where: { userType: 'REGIONAL_ADMIN' as any },
      select: { id: true },
    });
    const summary = [
      result.walletDrifts.length ? `${result.walletDrifts.length} wallet(s)` : null,
      result.treasuryDrifts.length ? `${result.treasuryDrifts.length} company treasury(s)` : null,
      result.platformDrift ? `platform treasury (δ=${result.platformDrift.delta.toFixed(2)})` : null,
    ].filter(Boolean).join(', ');

    for (const a of admins) {
      this.notifications.createNotification({
        userId: a.id,
        type: 'ledger_drift_alert',
        title: 'Ledger reconciliation alert',
        message: `Balance/ledger drift detected: ${summary}. Check the admin audit log before any money moves — do NOT auto-fix balances.`,
        payload: {
          walletDrifts: result.walletDrifts.slice(0, 10),
          treasuryDrifts: result.treasuryDrifts.slice(0, 10),
          platformDrift: result.platformDrift,
        },
      }).catch(() => {});
    }
  }
}
