/**
 * Refund Strategy — refunds patient based on cancellation timing policy.
 * >24h before: 100% refund
 * 2-24h before: 50% refund
 * <2h before: 0% refund
 */
import prisma from '@/lib/db'
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types'

export class RefundStrategy implements StepFlagHandler {
  flag = 'triggers_refund' as const

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    // Find the original payment transaction for this booking
    const patientWallet = await prisma.userWallet.findUnique({
      where: { userId: ctx.patientUserId },
    })

    if (!patientWallet) return {}

    const paymentTx = await prisma.walletTransaction.findFirst({
      where: {
        walletId: patientWallet.id,
        referenceId: ctx.bookingId,
        type: 'debit',
        status: 'completed',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!paymentTx) return {} // No payment found — nothing to refund

    // Calculate refund based on scheduled time
    const scheduledAt = await getScheduledTime(ctx)
    const refundPercent = calculateRefundPercent(scheduledAt)
    const refundAmount = Math.round(paymentTx.amount * refundPercent / 100 * 100) / 100

    if (refundAmount <= 0) return { refundProcessed: { amount: 0, refundPercent: 0 } }

    await prisma.$transaction(async (tx) => {
      // Credit patient
      await tx.userWallet.update({
        where: { userId: ctx.patientUserId },
        data: { balance: { increment: refundAmount } },
      })

      // Debit provider (only the provider's share)
      const providerAmount = Math.round(refundAmount * 0.85 * 100) / 100
      const providerWallet = await tx.userWallet.findUnique({
        where: { userId: ctx.providerUserId },
      })

      if (providerWallet && providerWallet.balance >= providerAmount) {
        await tx.userWallet.update({
          where: { userId: ctx.providerUserId },
          data: { balance: { decrement: providerAmount } },
        })
      }

      // Record refund transaction
      const currentBalance = await tx.userWallet.findUnique({
        where: { userId: ctx.patientUserId },
        select: { balance: true },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: patientWallet.id,
          type: 'credit',
          amount: refundAmount,
          description: `Refund (${refundPercent}%) for booking ${ctx.bookingId}`,
          serviceType: 'refund',
          referenceId: ctx.bookingId,
          status: 'completed',
          balanceBefore: (currentBalance?.balance ?? 0) - refundAmount,
          balanceAfter: currentBalance?.balance ?? 0,
        },
      })
    })

    return {
      refundProcessed: { amount: refundAmount, refundPercent },
    }
  }
}

function calculateRefundPercent(scheduledAt: Date | null): number {
  if (!scheduledAt) return 100 // If no scheduled time, full refund

  const now = new Date()
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntil > 24) return 100
  if (hoursUntil > 2) return 50
  return 0
}

async function getScheduledTime(ctx: TransitionContext): Promise<Date | null> {
  // Try to get scheduled time from booking
  const meta = (await prisma.workflowInstance.findUnique({
    where: { id: ctx.instanceId },
    select: { metadata: true },
  }))?.metadata as Record<string, unknown> | null

  if (meta?.scheduledAt) {
    return new Date(meta.scheduledAt as string)
  }

  return null
}
