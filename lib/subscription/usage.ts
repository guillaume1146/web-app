import prisma from '@/lib/db'

export type ConsultType = 'gp' | 'specialist' | 'nurse' | 'mental_health' | 'nutrition' | 'ambulance'

/** Maps consult type to plan limit field and usage counter field. */
const CONSULT_FIELD_MAP: Record<ConsultType, { limitField: string; usageField: string }> = {
  gp:            { limitField: 'gpConsultsPerMonth',           usageField: 'gpConsultsUsed' },
  specialist:    { limitField: 'specialistConsultsPerMonth',   usageField: 'specialistConsultsUsed' },
  nurse:         { limitField: 'nurseConsultsPerMonth',        usageField: 'nurseConsultsUsed' },
  mental_health: { limitField: 'mentalHealthConsultsPerMonth', usageField: 'mentalHealthConsultsUsed' },
  nutrition:     { limitField: 'nutritionConsultsPerMonth',    usageField: 'nutritionConsultsUsed' },
  ambulance:     { limitField: 'ambulanceFreePerMonth',        usageField: 'ambulanceUsed' },
}

/**
 * Get or create the current month's usage record for a subscription.
 */
export async function getOrCreateUsage(subscriptionId: string) {
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const existing = await prisma.subscriptionUsage.findUnique({
    where: { subscriptionId_month: { subscriptionId, month } },
  })

  if (existing) return existing

  return prisma.subscriptionUsage.create({
    data: { subscriptionId, month },
  })
}

/**
 * Track a consultation usage against the user's subscription.
 * Returns { allowed, remaining, message } indicating whether the consult is within the free tier.
 */
export async function trackConsultationUsage(
  userId: string,
  consultType: ConsultType
): Promise<{ allowed: boolean; remaining: number; covered: boolean; message: string }> {
  const fieldMap = CONSULT_FIELD_MAP[consultType]
  if (!fieldMap) {
    return { allowed: true, remaining: 0, covered: false, message: 'Unknown consultation type — full price applies.' }
  }

  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      plan: {
        select: {
          name: true,
          gpConsultsPerMonth: true,
          specialistConsultsPerMonth: true,
          nurseConsultsPerMonth: true,
          mentalHealthConsultsPerMonth: true,
          nutritionConsultsPerMonth: true,
          ambulanceFreePerMonth: true,
        },
      },
    },
  })

  // No active subscription — allow but charge full price
  if (!subscription || subscription.status !== 'active') {
    return { allowed: true, remaining: 0, covered: false, message: 'No active subscription — full price applies.' }
  }

  const usage = await getOrCreateUsage(subscription.id)
  const plan = subscription.plan as Record<string, unknown>
  const limit = plan[fieldMap.limitField] as number
  const used = (usage as Record<string, unknown>)[fieldMap.usageField] as number

  const label = consultType.replace('_', ' ')

  // -1 = unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1, covered: true, message: `Unlimited ${label} consultations included in your plan.` }
  }

  if (limit === 0) {
    return { allowed: true, remaining: 0, covered: false, message: `${label} consultations not included — standard rate applies.` }
  }

  if (used < limit) {
    // Increment usage
    await prisma.subscriptionUsage.update({
      where: { id: usage.id },
      data: { [fieldMap.usageField]: { increment: 1 } },
    })
    return {
      allowed: true,
      remaining: limit - used - 1,
      covered: true, // This consultation was covered by the plan (free slot used)
      message: `Free ${label} consultation (${limit - used - 1} remaining this month).`,
    }
  }

  return { allowed: true, remaining: 0, covered: false, message: `Monthly ${label} consultations used — standard rate applies.` }
}

/**
 * Get the subscription discount for a service type.
 * Checks two sources:
 * 1. Per-service discountPercent from SubscriptionPlanService (configured by regional admin)
 * 2. Plan-level discounts JSON (e.g. {"specialist": 20, "lab": 15})
 * Returns the highest discount found.
 */
export async function getSubscriptionDiscount(
  userId: string,
  serviceType: string,
  platformServiceId?: string
): Promise<{ discountPercent: number; message: string }> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    select: {
      status: true,
      planId: true,
      plan: {
        select: { discounts: true, name: true },
      },
    },
  })

  if (!subscription || subscription.status !== 'active') {
    return { discountPercent: 0, message: 'No active subscription.' }
  }

  let bestDiscount = 0
  let source = ''

  // Source 1: Per-service discount from SubscriptionPlanService
  if (platformServiceId) {
    const planService = await prisma.subscriptionPlanService.findFirst({
      where: {
        planId: subscription.planId,
        platformServiceId,
      },
      select: { discountPercent: true, isFree: true },
    })
    if (planService?.isFree) {
      return { discountPercent: 100, message: `Service included free in ${subscription.plan.name} plan.` }
    }
    if (planService && planService.discountPercent > bestDiscount) {
      bestDiscount = planService.discountPercent
      source = 'plan service config'
    }
  }

  // Source 2: Plan-level discounts JSON
  const discounts = subscription.plan.discounts as Record<string, number> | null
  if (discounts && discounts[serviceType] && discounts[serviceType] > bestDiscount) {
    bestDiscount = discounts[serviceType]
    source = 'plan discount'
  }

  if (bestDiscount === 0) {
    return { discountPercent: 0, message: 'No discount for this service.' }
  }

  return {
    discountPercent: bestDiscount,
    message: `${bestDiscount}% discount applied from ${subscription.plan.name} plan (${source}).`,
  }
}

/**
 * Get the user's current subscription usage summary.
 */
export async function getUsageSummary(userId: string) {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      autoRenew: true,
      plan: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          price: true,
          currency: true,
          gpConsultsPerMonth: true,
          specialistConsultsPerMonth: true,
          nurseConsultsPerMonth: true,
          mentalHealthConsultsPerMonth: true,
          nutritionConsultsPerMonth: true,
          ambulanceFreePerMonth: true,
          discounts: true,
          features: true,
        },
      },
    },
  })

  if (!subscription) {
    return { hasSubscription: false, plan: null, usage: null }
  }

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const usage = await prisma.subscriptionUsage.findUnique({
    where: { subscriptionId_month: { subscriptionId: subscription.id, month } },
  })

  return {
    hasSubscription: true,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    autoRenew: subscription.autoRenew,
    plan: subscription.plan,
    usage: {
      month,
      gpConsultsUsed: usage?.gpConsultsUsed ?? 0,
      specialistConsultsUsed: usage?.specialistConsultsUsed ?? 0,
      nurseConsultsUsed: usage?.nurseConsultsUsed ?? 0,
      mentalHealthConsultsUsed: usage?.mentalHealthConsultsUsed ?? 0,
      nutritionConsultsUsed: usage?.nutritionConsultsUsed ?? 0,
      ambulanceUsed: usage?.ambulanceUsed ?? 0,
      gpConsultsLimit: subscription.plan.gpConsultsPerMonth,
      specialistConsultsLimit: subscription.plan.specialistConsultsPerMonth,
      nurseConsultsLimit: subscription.plan.nurseConsultsPerMonth,
      mentalHealthConsultsLimit: subscription.plan.mentalHealthConsultsPerMonth,
      nutritionConsultsLimit: subscription.plan.nutritionConsultsPerMonth,
      ambulanceLimit: subscription.plan.ambulanceFreePerMonth,
    },
  }
}
