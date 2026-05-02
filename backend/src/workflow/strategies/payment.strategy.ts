import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceService } from '../../shared/services/invoice.service';
import { TreasuryService } from '../../shared/services/treasury.service';
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types';

@Injectable()
export class PaymentStrategy implements StepFlagHandler {
  flag = 'triggers_payment' as const;
  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private treasury: TreasuryService,
  ) {}

  async validate(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }> {
    const amount = await this.resolveAmount(ctx);
    if (amount <= 0) return { valid: true, errors: [] };
    const wallet = await this.prisma.userWallet.findUnique({ where: { userId: ctx.patientUserId }, select: { balance: true } });
    if (!wallet || wallet.balance < amount) {
      return { valid: false, errors: [`Insufficient wallet balance. Required: ${amount} Rs, Available: ${wallet?.balance ?? 0} Rs`] };
    }
    return { valid: true, errors: [] };
  }

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const amount = await this.resolveAmount(ctx);
    if (amount <= 0) return {};
    const platformCommission = Math.round(amount * 0.15 * 100) / 100;
    const providerAmount = amount - platformCommission;
    const patientWallet = await this.prisma.userWallet.findUnique({ where: { userId: ctx.patientUserId } });
    const providerWallet = await this.prisma.userWallet.findUnique({ where: { userId: ctx.providerUserId } });
    if (!patientWallet) return {};

    await this.prisma.$transaction(async (tx) => {
      await tx.userWallet.update({ where: { userId: ctx.patientUserId }, data: { balance: { decrement: amount } } });
      if (providerWallet) {
        await tx.userWallet.update({ where: { userId: ctx.providerUserId }, data: { balance: { increment: providerAmount } } });
      }
      await tx.walletTransaction.create({
        data: {
          walletId: patientWallet.id, type: 'debit', amount, description: `Booking ${ctx.bookingId}`,
          serviceType: 'consultation', referenceId: ctx.bookingId, status: 'completed',
          balanceBefore: patientWallet.balance, balanceAfter: patientWallet.balance - amount,
          platformCommission, providerAmount,
        },
      });
      if (providerWallet) {
        await tx.walletTransaction.create({
          data: {
            walletId: providerWallet.id, type: 'credit', amount: providerAmount, description: `Booking ${ctx.bookingId}`,
            serviceType: 'consultation', referenceId: ctx.bookingId, status: 'completed',
            balanceBefore: providerWallet.balance, balanceAfter: providerWallet.balance + providerAmount,
            platformCommission, providerAmount,
          },
        });
      }
      // Platform 15% lands in PlatformTreasury — previously this amount was
      // recorded as a WalletTransaction column but never moved anywhere, so
      // it was invisible to reconciliation. Fixed Apr 2026.
      await this.treasury.creditPlatformFee(tx, {
        amount: platformCommission,
        source: 'booking',
        referenceId: ctx.bookingId,
        description: `Booking ${ctx.bookingId} platform fee`,
      });
    });
    // Generate invoice after successful payment
    await this.invoiceService.generateInvoice({
      patientUserId: ctx.patientUserId,
      providerUserId: ctx.providerUserId,
      bookingId: ctx.bookingId,
      type: 'booking_payment',
      amount,
      platformFee: platformCommission,
      providerAmount,
      description: `Booking payment — ${ctx.bookingId}`,
    }).catch(() => {}); // non-blocking

    return { paymentProcessed: { amount, patientDebited: amount, providerCredited: providerAmount } };
  }

  /**
   * Server-authoritative price resolution. Never trust client-supplied amounts —
   * always read `servicePrice` from the WorkflowInstance metadata, which was
   * itself populated server-side by the booking service from the provider's
   * configured price. Previously this method honored `ctx.input.contentData.amount`,
   * which let a crafted client request zero out the charge.
   */
  private async resolveAmount(ctx: TransitionContext): Promise<number> {
    const instance = await this.prisma.workflowInstance.findUnique({ where: { id: ctx.instanceId }, select: { metadata: true } });
    const meta = instance?.metadata as Record<string, unknown> | null;
    if (meta?.servicePrice && typeof meta.servicePrice === 'number') return meta.servicePrice;
    return 0;
  }
}
