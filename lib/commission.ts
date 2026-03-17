import prisma from '@/lib/db'

// Env var fallbacks (used only if DB config not yet created)
const ENV_PLATFORM_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '15')
const ENV_REGIONAL_RATE = parseFloat(process.env.REGIONAL_COMMISSION_RATE || '0')

interface CommissionRates {
  platformRate: number
  regionalRate: number
  providerRate: number
}

interface CommissionSplit {
  platformCommission: number
  regionalCommission: number
  providerAmount: number
  regionalAdminId: string | null
}

/**
 * Load commission rates from the PlatformConfig table (singleton).
 * Falls back to env vars if no config exists yet.
 */
async function loadRates(): Promise<CommissionRates> {
  const config = await prisma.platformConfig.findFirst()
  if (config) {
    return {
      platformRate: config.platformCommissionRate,
      regionalRate: config.regionalCommissionRate,
      providerRate: config.providerCommissionRate,
    }
  }
  return {
    platformRate: ENV_PLATFORM_RATE,
    regionalRate: ENV_REGIONAL_RATE,
    providerRate: 100 - ENV_PLATFORM_RATE - ENV_REGIONAL_RATE,
  }
}

/**
 * Calculate commission split for a transaction.
 * Platform takes 15%, Provider gets 85%. Regional admins earn from subscription revenue, not per-transaction.
 */
export async function calculateCommission(
  totalAmount: number,
  providerUserId: string
): Promise<CommissionSplit> {
  const rates = await loadRates()

  // Find the regional admin for this provider's region (kept for audit trail)
  const provider = await prisma.user.findUnique({
    where: { id: providerUserId },
    select: { address: true },
  })

  let regionalAdmin = null

  if (provider?.address) {
    regionalAdmin = await prisma.regionalAdminProfile.findFirst({
      where: {
        user: { accountStatus: 'active' },
        OR: [
          { region: { contains: provider.address, mode: 'insensitive' } },
          { country: { contains: provider.address, mode: 'insensitive' } },
        ],
      },
      select: { id: true, userId: true },
    })
  }

  // Fallback: use the first active regional admin
  if (!regionalAdmin) {
    regionalAdmin = await prisma.regionalAdminProfile.findFirst({
      where: { user: { accountStatus: 'active' } },
      select: { id: true, userId: true },
    })
  }

  const platformRate = rates.platformRate / 100
  const providerRate = rates.providerRate / 100

  const platformCommission = Math.round(totalAmount * platformRate * 100) / 100
  const providerAmount = Math.round(totalAmount * providerRate * 100) / 100

  return {
    platformCommission,
    regionalCommission: 0, // Regional admins earn from subscriptions, not per-transaction
    providerAmount,
    regionalAdminId: regionalAdmin?.userId ?? null,
  }
}

/**
 * Process a service payment: debit patient, credit provider, distribute commissions.
 * Called when a provider confirms a booking.
 */
export async function processServicePayment(params: {
  patientUserId: string
  providerUserId: string
  amount: number
  description: string
  serviceType: string
  referenceId: string
}): Promise<{ success: boolean; error?: string }> {
  const { patientUserId, providerUserId, amount, description, serviceType, referenceId } = params

  const commission = await calculateCommission(amount, providerUserId)

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Debit patient wallet
      const patientWallet = await tx.userWallet.findUnique({
        where: { userId: patientUserId },
        select: { id: true, balance: true },
      })

      if (!patientWallet) throw new Error('WALLET_NOT_FOUND')
      if (patientWallet.balance < amount) throw new Error('INSUFFICIENT_BALANCE')

      const patientBalanceAfter = patientWallet.balance - amount

      await tx.userWallet.update({
        where: { id: patientWallet.id },
        data: { balance: patientBalanceAfter },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: patientWallet.id,
          type: 'debit',
          amount,
          description,
          serviceType,
          referenceId,
          balanceBefore: patientWallet.balance,
          balanceAfter: patientBalanceAfter,
          status: 'completed',
          platformCommission: commission.platformCommission,
          regionalCommission: 0,
          providerAmount: commission.providerAmount,
          regionalAdminId: commission.regionalAdminId,
        },
      })

      // 2. Credit provider wallet
      const providerWallet = await tx.userWallet.findUnique({
        where: { userId: providerUserId },
        select: { id: true, balance: true },
      })

      if (providerWallet) {
        const providerBalanceAfter = providerWallet.balance + commission.providerAmount

        await tx.userWallet.update({
          where: { id: providerWallet.id },
          data: { balance: providerBalanceAfter },
        })

        await tx.walletTransaction.create({
          data: {
            walletId: providerWallet.id,
            type: 'credit',
            amount: commission.providerAmount,
            description: `Earnings: ${description}`,
            serviceType,
            referenceId,
            balanceBefore: providerWallet.balance,
            balanceAfter: providerBalanceAfter,
            status: 'completed',
            platformCommission: commission.platformCommission,
            regionalCommission: 0,
            providerAmount: commission.providerAmount,
            regionalAdminId: commission.regionalAdminId,
          },
        })
      }
    })

    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Transaction failed' }
  }
}
