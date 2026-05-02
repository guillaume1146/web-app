import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Treasury helpers — every insurance-company money movement goes through
 * here so accounting stays consistent. All amounts in Health Credit (same
 * unit as UserWallet.balance).
 *
 * Platform fee: MediWyz takes a configurable % cut on each member
 * contribution (default 5%). That cut flows to PlatformTreasury.
 */
@Injectable()
export class TreasuryService {
  constructor(private prisma: PrismaService) {}

  private readonly platformFeePercent = Number(process.env.MEDIWYZ_PLATFORM_FEE_PERCENT || 5);

  /** Get or create the single PlatformTreasury row. */
  private async ensurePlatformTreasury(tx?: any) {
    const db = tx ?? this.prisma;
    const existing = await db.platformTreasury.findFirst();
    if (existing) return existing;
    return db.platformTreasury.create({ data: { balance: 0 } });
  }

  /** Get or create a company's treasury. */
  async ensureCompanyTreasury(companyProfileId: string, tx?: any) {
    const db = tx ?? this.prisma;
    const existing = await db.insuranceCompanyTreasury.findUnique({ where: { companyProfileId } });
    if (existing) return existing;
    return db.insuranceCompanyTreasury.create({
      data: { companyProfileId, balance: 0 },
    });
  }

  /**
   * Credit member contribution → company treasury, minus platform fee.
   * Must be called inside an existing `$transaction`.
   */
  async creditContribution(tx: any, args: {
    companyProfileId: string;
    memberId: string;
    amount: number;
    description: string;
  }) {
    if (args.amount <= 0) return;
    const platformFee = Math.round(args.amount * (this.platformFeePercent / 100) * 100) / 100;
    const netToTreasury = args.amount - platformFee;

    const treasury = await this.ensureCompanyTreasury(args.companyProfileId, tx);
    const balanceBefore = treasury.balance;
    const balanceAfter = balanceBefore + netToTreasury;

    await tx.insuranceCompanyTreasury.update({
      where: { id: treasury.id },
      data: {
        balance: balanceAfter,
        totalInflow: { increment: netToTreasury },
      },
    });
    await tx.treasuryTransaction.create({
      data: {
        treasuryId: treasury.id,
        type: 'contribution',
        amount: netToTreasury,
        memberId: args.memberId,
        description: args.description,
        balanceBefore, balanceAfter,
      },
    });

    // Platform fee cut — moves to PlatformTreasury with a ledger row on the
    // company side (for traceability) AND a ledger row on the platform side.
    if (platformFee > 0) {
      await this.creditPlatformFee(tx, {
        amount: platformFee,
        source: 'insurance_contribution',
        referenceId: args.memberId,
        description: `Platform fee from ${args.description} (${this.platformFeePercent}%)`,
      });
      // Also log on the company's own ledger for easy audit from the owner UI.
      await tx.treasuryTransaction.create({
        data: {
          treasuryId: treasury.id,
          type: 'platform_fee',
          amount: platformFee,
          memberId: args.memberId,
          description: `Platform fee (${this.platformFeePercent}%)`,
          balanceBefore: balanceAfter,
          balanceAfter, // treasury balance unchanged by this marker entry
        },
      });
    }
  }

  /**
   * Every 15/85-split site outside the insurance module (booking payment,
   * inventory orders, subscriptions, debitWallet) should call this helper
   * so the platform's 15% actually lands somewhere auditable. Previously the
   * cut was only recorded as a `platformCommission` column on the wallet
   * transaction — useful for reports, useless for reconciliation.
   */
  async creditPlatformFee(tx: any, args: {
    amount: number;
    source: string;        // e.g. 'booking' | 'inventory' | 'subscription' | 'insurance_contribution'
    referenceId?: string;  // booking id, order id, plan id, memberId
    description: string;
  }) {
    if (args.amount <= 0) return;
    const platform = await this.ensurePlatformTreasury(tx);
    const balanceBefore = platform.balance;
    const balanceAfter = balanceBefore + args.amount;
    await tx.platformTreasury.update({
      where: { id: platform.id },
      data: { balance: balanceAfter },
    });
    // PlatformTreasury uses the same TreasuryTransaction ledger — the
    // `treasuryId` points to the platform row, not a company row.
    await tx.treasuryTransaction.create({
      data: {
        treasuryId: platform.id,
        type: 'platform_fee',
        amount: args.amount,
        description: `[${args.source}] ${args.description}`,
        claimId: args.referenceId,
        balanceBefore, balanceAfter,
      },
    });
  }

  /**
   * Debit company treasury → member wallet for a claim payout.
   * Throws if treasury balance is insufficient. Must be called inside a tx.
   */
  async payoutClaim(tx: any, args: {
    companyProfileId: string;
    memberId: string;
    claimId: string;
    amount: number;
    description: string;
  }) {
    if (args.amount <= 0) return;
    const treasury = await this.ensureCompanyTreasury(args.companyProfileId, tx);
    if (treasury.balance < args.amount) {
      throw new Error(`Insurance treasury has insufficient funds (${treasury.balance.toFixed(0)} < ${args.amount.toFixed(0)})`);
    }
    const balanceBefore = treasury.balance;
    const balanceAfter = balanceBefore - args.amount;

    await tx.insuranceCompanyTreasury.update({
      where: { id: treasury.id },
      data: { balance: balanceAfter, totalOutflow: { increment: args.amount } },
    });
    await tx.treasuryTransaction.create({
      data: {
        treasuryId: treasury.id,
        type: 'claim_payout',
        amount: args.amount,
        memberId: args.memberId,
        claimId: args.claimId,
        description: args.description,
        balanceBefore, balanceAfter,
      },
    });

    // Credit member wallet.
    const memberWallet = await tx.userWallet.findUnique({
      where: { userId: args.memberId }, select: { id: true, balance: true },
    });
    if (!memberWallet) throw new Error('Member wallet not found');
    await tx.userWallet.update({
      where: { id: memberWallet.id },
      data: { balance: memberWallet.balance + args.amount },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: memberWallet.id,
        type: 'credit',
        amount: args.amount,
        description: args.description,
        status: 'completed',
        balanceBefore: memberWallet.balance,
        balanceAfter: memberWallet.balance + args.amount,
      },
    });
  }

  /** Direct billing — debit treasury → provider wallet (tiers payant). */
  async payoutProviderDirect(tx: any, args: {
    companyProfileId: string;
    providerId: string;
    claimId: string;
    amount: number;
    description: string;
  }) {
    if (args.amount <= 0) return;
    const treasury = await this.ensureCompanyTreasury(args.companyProfileId, tx);
    if (treasury.balance < args.amount) {
      throw new Error(`Insurance treasury has insufficient funds for direct billing`);
    }
    const balanceBefore = treasury.balance;
    const balanceAfter = balanceBefore - args.amount;

    await tx.insuranceCompanyTreasury.update({
      where: { id: treasury.id },
      data: { balance: balanceAfter, totalOutflow: { increment: args.amount } },
    });
    await tx.treasuryTransaction.create({
      data: {
        treasuryId: treasury.id,
        type: 'direct_billing',
        amount: args.amount,
        memberId: args.providerId, // reuse field as "recipient"
        claimId: args.claimId,
        description: args.description,
        balanceBefore, balanceAfter,
      },
    });

    // Credit provider wallet.
    const wallet = await tx.userWallet.findUnique({
      where: { userId: args.providerId }, select: { id: true, balance: true },
    });
    if (!wallet) throw new Error('Provider wallet not found');
    await tx.userWallet.update({
      where: { id: wallet.id },
      data: { balance: wallet.balance + args.amount },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'credit',
        amount: args.amount,
        description: args.description,
        status: 'completed',
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + args.amount,
      },
    });
  }
}
