import prisma from '@/lib/db'
import { trackConsultationUsage, getSubscriptionDiscount, ConsultType } from '@/lib/subscription/usage'

/**
 * Check if the patient has sufficient wallet balance for a booking.
 * Returns { sufficient: true } or { sufficient: false, balance, required }.
 */
export async function checkPatientBalance(
  patientUserId: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; balance?: number; required?: number }> {
  const wallet = await prisma.userWallet.findUnique({
    where: { userId: patientUserId },
    select: { balance: true },
  })

  if (!wallet) {
    return { sufficient: false, balance: 0, required: requiredAmount }
  }

  if (wallet.balance < requiredAmount) {
    return { sufficient: false, balance: wallet.balance, required: requiredAmount }
  }

  return { sufficient: true }
}

/**
 * Resolve the effective price for a service, considering:
 * 1. Provider's price override (from ProviderServiceConfig)
 * 2. Admin's plan price (from SubscriptionPlanService)
 * 3. Default platform service price
 *
 * The provider's price is the "market price" (what the provider charges).
 * This is the base from which discounts are applied.
 */
export async function resolveServicePrice(params: {
  platformServiceId?: string
  providerUserId?: string
}): Promise<{ marketPrice: number; source: string }> {
  const { platformServiceId, providerUserId } = params

  if (!platformServiceId) {
    return { marketPrice: 0, source: 'unknown' }
  }

  // Check provider's price override first
  if (providerUserId) {
    const config = await prisma.providerServiceConfig.findUnique({
      where: {
        platformServiceId_providerUserId: {
          platformServiceId,
          providerUserId,
        },
      },
      select: { priceOverride: true },
    })

    if (config?.priceOverride != null) {
      return { marketPrice: config.priceOverride, source: 'provider_override' }
    }
  }

  // Fall back to platform service default price
  const service = await prisma.platformService.findUnique({
    where: { id: platformServiceId },
    select: { defaultPrice: true },
  })

  return { marketPrice: service?.defaultPrice ?? 0, source: 'platform_default' }
}

/**
 * Check booking cost considering subscription benefits.
 *
 * Pricing logic (per the business model):
 * 1. Is this service INCLUDED in the plan (free quota)?
 *    YES → Employee pays 0, quota decremented
 * 2. Is there a discount for this service type?
 *    YES → Apply discount % to provider's MARKET price → Employee pays reduced price
 * 3. Otherwise → Employee pays full market price
 *
 * For corporate employees: the subscription was paid by the employer.
 * The employee only pays for services NOT included in the plan (at discounted or full rate).
 */
export async function checkBookingCost(params: {
  patientUserId: string
  baseFee: number          // Provider's market price for this service
  consultType: ConsultType // For checking free quota (gp, specialist, nurse, etc.)
  serviceType?: string     // For discount lookup (lab, pharmacy, specialist, etc.)
}): Promise<{
  coveredBySubscription: boolean
  discount: number
  discountPercent: number
  adjustedFee: number       // What the patient actually pays
  sufficient: boolean
  balance: number
  isCorporate: boolean      // Whether this is a corporate-sponsored subscription
  message: string
}> {
  const { patientUserId, baseFee, consultType, serviceType } = params

  // Check if user has a subscription (individual or corporate-sponsored)
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId: patientUserId },
    select: { corporateAdminId: true, status: true },
  })
  const isCorporate = !!subscription?.corporateAdminId
  const hasActiveSub = subscription?.status === 'active'

  // Step 1: Check if consultation is covered by subscription quota (free)
  if (hasActiveSub) {
    const usageResult = await trackConsultationUsage(patientUserId, consultType)

    // If consultation was covered by plan (free slot used) → patient pays 0
    if (usageResult.covered) {
      const wallet = await prisma.userWallet.findUnique({
        where: { userId: patientUserId },
        select: { balance: true },
      })
      return {
        coveredBySubscription: true,
        discount: baseFee,
        discountPercent: 100,
        adjustedFee: 0,
        sufficient: true,
        balance: wallet?.balance ?? 0,
        isCorporate,
        message: usageResult.message,
      }
    }

    // Step 2: Quota exhausted — check for discount on the provider's market price
    if (serviceType) {
      const discountResult = await getSubscriptionDiscount(patientUserId, serviceType)
      if (discountResult.discountPercent > 0) {
        const discountAmount = Math.round((baseFee * discountResult.discountPercent) / 100)
        const adjustedFee = baseFee - discountAmount

        const wallet = await prisma.userWallet.findUnique({
          where: { userId: patientUserId },
          select: { balance: true },
        })
        const balance = wallet?.balance ?? 0

        return {
          coveredBySubscription: false,
          discount: discountAmount,
          discountPercent: discountResult.discountPercent,
          adjustedFee,
          sufficient: balance >= adjustedFee,
          balance,
          isCorporate,
          message: `${discountResult.message} You pay ${adjustedFee} instead of ${baseFee}.`,
        }
      }
    }
  }

  // Step 3: No subscription or no discount → full market price
  const wallet = await prisma.userWallet.findUnique({
    where: { userId: patientUserId },
    select: { balance: true },
  })
  const balance = wallet?.balance ?? 0

  return {
    coveredBySubscription: false,
    discount: 0,
    discountPercent: 0,
    adjustedFee: baseFee,
    sufficient: balance >= baseFee,
    balance,
    isCorporate,
    message: hasActiveSub
      ? 'Monthly quota used — full market price applies.'
      : 'No active subscription — full market price applies.',
  }
}
