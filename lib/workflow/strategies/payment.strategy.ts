/**
 * Payment Strategy — debits patient wallet, credits provider on booking acceptance.
 */
import prisma from '@/lib/db'
import type { StepFlagHandler, TransitionContext, StepFlagResult } from '../types'

export class PaymentStrategy implements StepFlagHandler {
  flag = 'triggers_payment' as const

  async validate(ctx: TransitionContext): Promise<{ valid: boolean; errors: string[] }> {
    // Check patient has sufficient wallet balance
    // Amount comes from the booking's servicePrice or instance metadata
    const amount = await resolveAmount(ctx)
    if (amount <= 0) return { valid: true, errors: [] }

    const wallet = await prisma.userWallet.findUnique({
      where: { userId: ctx.patientUserId },
      select: { balance: true },
    })

    if (!wallet || wallet.balance < amount) {
      return {
        valid: false,
        errors: [`Insufficient wallet balance. Required: ${amount} Rs, Available: ${wallet?.balance ?? 0} Rs`],
      }
    }

    return { valid: true, errors: [] }
  }

  async execute(ctx: TransitionContext): Promise<StepFlagResult> {
    const amount = await resolveAmount(ctx)
    if (amount <= 0) return {}

    // Platform commission: 15% / Provider: 85%
    const platformCommission = Math.round(amount * 0.15 * 100) / 100
    const providerAmount = amount - platformCommission

    const patientWallet = await prisma.userWallet.findUnique({ where: { userId: ctx.patientUserId } })
    const providerWallet = await prisma.userWallet.findUnique({ where: { userId: ctx.providerUserId } })

    if (!patientWallet) return {}

    await prisma.$transaction(async (tx) => {
      // Debit patient
      await tx.userWallet.update({
        where: { userId: ctx.patientUserId },
        data: { balance: { decrement: amount } },
      })

      // Credit provider
      if (providerWallet) {
        await tx.userWallet.update({
          where: { userId: ctx.providerUserId },
          data: { balance: { increment: providerAmount } },
        })
      }

      // Record transactions
      await tx.walletTransaction.create({
        data: {
          walletId: patientWallet.id,
          type: 'debit',
          amount,
          description: `Booking ${ctx.bookingId}`,
          serviceType: 'consultation',
          referenceId: ctx.bookingId,
          status: 'completed',
          balanceBefore: patientWallet.balance,
          balanceAfter: patientWallet.balance - amount,
          platformCommission,
          providerAmount,
        },
      })

      if (providerWallet) {
        await tx.walletTransaction.create({
          data: {
            walletId: providerWallet.id,
            type: 'credit',
            amount: providerAmount,
            description: `Booking ${ctx.bookingId}`,
            serviceType: 'consultation',
            referenceId: ctx.bookingId,
            status: 'completed',
            balanceBefore: providerWallet.balance,
            balanceAfter: providerWallet.balance + providerAmount,
            platformCommission,
            providerAmount,
          },
        })
      }
    })

    return {
      paymentProcessed: {
        amount,
        patientDebited: amount,
        providerCredited: providerAmount,
      },
    }
  }
}

async function resolveAmount(ctx: TransitionContext): Promise<number> {
  // Try to get amount from instance metadata
  const metadata = ctx.input.contentData as Record<string, unknown> | undefined
  if (metadata?.amount && typeof metadata.amount === 'number') {
    return metadata.amount
  }

  // Try to get from booking model
  const instance = await prisma.workflowInstance.findUnique({
    where: { id: ctx.instanceId },
    select: { metadata: true },
  })

  const meta = instance?.metadata as Record<string, unknown> | null
  if (meta?.servicePrice && typeof meta.servicePrice === 'number') {
    return meta.servicePrice
  }

  return 0
}
