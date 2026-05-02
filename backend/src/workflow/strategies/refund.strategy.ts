import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types';

@Injectable()
export class RefundStrategy implements StepFlagHandler {
  flag = 'triggers_refund' as const;
  constructor(private prisma: PrismaService) {}

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const patientWallet = await this.prisma.userWallet.findUnique({ where: { userId: ctx.patientUserId } });
    if (!patientWallet) return {};
    const paymentTx = await this.prisma.walletTransaction.findFirst({
      where: { walletId: patientWallet.id, referenceId: ctx.bookingId, type: 'debit', status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });
    if (!paymentTx) return {};

    // Idempotency — if a refund ledger row already exists for this booking, skip.
    const existingRefund = await this.prisma.walletTransaction.findFirst({
      where: { walletId: patientWallet.id, referenceId: ctx.bookingId, serviceType: 'refund' },
    });
    if (existingRefund) return { refundProcessed: { amount: existingRefund.amount, refundPercent: 0 } };

    const scheduledAt = await this.getScheduledTime(ctx);
    const refundPercent = this.calculateRefundPercent(scheduledAt);
    const refundAmount = Math.round(paymentTx.amount * refundPercent / 100 * 100) / 100;
    if (refundAmount <= 0) return { refundProcessed: { amount: 0, refundPercent: 0 } };

    const providerAmount = Math.round(refundAmount * 0.85 * 100) / 100;

    await this.prisma.$transaction(async (tx) => {
      // Patient credit + ledger row.
      const patientBefore = patientWallet.balance;
      await tx.userWallet.update({ where: { id: patientWallet.id }, data: { balance: patientBefore + refundAmount } });
      await tx.walletTransaction.create({
        data: {
          walletId: patientWallet.id, type: 'credit', amount: refundAmount,
          description: `Refund (${refundPercent}%) for booking ${ctx.bookingId}`, serviceType: 'refund',
          referenceId: ctx.bookingId, status: 'completed',
          balanceBefore: patientBefore, balanceAfter: patientBefore + refundAmount,
        },
      });

      // Provider debit + ledger row — previously the debit skipped the ledger,
      // creating a silent balance write. Fixed to always pair a row with the
      // balance change so reconciliation is exact.
      const providerWallet = await tx.userWallet.findUnique({ where: { userId: ctx.providerUserId } });
      if (providerWallet && providerWallet.balance >= providerAmount) {
        const providerBefore = providerWallet.balance;
        await tx.userWallet.update({ where: { id: providerWallet.id }, data: { balance: providerBefore - providerAmount } });
        await tx.walletTransaction.create({
          data: {
            walletId: providerWallet.id, type: 'debit', amount: providerAmount,
            description: `Refund clawback for booking ${ctx.bookingId}`, serviceType: 'refund',
            referenceId: ctx.bookingId, status: 'completed',
            balanceBefore: providerBefore, balanceAfter: providerBefore - providerAmount,
          },
        });
      }
    });
    return { refundProcessed: { amount: refundAmount, refundPercent } };
  }

  private calculateRefundPercent(scheduledAt: Date | null): number {
    if (!scheduledAt) return 100;
    const hoursUntil = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil > 24) return 100;
    if (hoursUntil > 2) return 50;
    return 0;
  }

  private async getScheduledTime(ctx: TransitionContext): Promise<Date | null> {
    const meta = (await this.prisma.workflowInstance.findUnique({ where: { id: ctx.instanceId }, select: { metadata: true } }))?.metadata as Record<string, unknown> | null;
    if (meta?.scheduledAt) return new Date(meta.scheduledAt as string);
    return null;
  }
}
