import prisma from '@/lib/db'

export type ConsultProvider = { role: string; specialty?: string | null }

/**
 * Build a usage key from role + specialty.
 * e.g. "DOCTOR:General Practice", "NURSE", "CAREGIVER:Elder Care"
 */
function usageKey(provider: ConsultProvider): string {
  return provider.specialty ? `${provider.role}:${provider.specialty}` : provider.role
}

/**
 * Find the quota limit for a provider from the plan's quotas JSON.
 * Checks exact match (role:specialty) first, then role-level fallback.
 */
function findQuotaLimit(
  quotas: Array<{ role: string; specialty?: string | null; limit: number }>,
  provider: ConsultProvider
): number {
  // Exact match: role + specialty
  if (provider.specialty) {
    const exact = quotas.find(q => q.role === provider.role && q.specialty === provider.specialty)
    if (exact) return exact.limit
  }
  // Fallback: role only (specialty null = any specialty)
  const roleLevel = quotas.find(q => q.role === provider.role && !q.specialty)
  return roleLevel?.limit ?? 0
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
    data: { subscriptionId, month, usageData: {} },
  })
}

/**
 * Track a consultation usage against the user's subscription.
 * Uses flexible quotas JSON: [{ role, specialty?, limit }]
 */
export async function trackConsultationUsage(
  userId: string,
  provider: ConsultProvider
): Promise<{ allowed: boolean; remaining: number; covered: boolean; message: string }> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      plan: {
        select: { name: true, quotas: true },
      },
    },
  })

  if (!subscription || subscription.status !== 'active') {
    return { allowed: true, remaining: 0, covered: false, message: 'No active subscription — full price applies.' }
  }

  const quotas = (subscription.plan.quotas ?? []) as Array<{ role: string; specialty?: string | null; limit: number }>
  const limit = findQuotaLimit(quotas, provider)
  const key = usageKey(provider)
  const label = provider.specialty ? `${provider.specialty}` : provider.role.toLowerCase()

  if (limit === -1) {
    return { allowed: true, remaining: -1, covered: true, message: `Unlimited ${label} consultations included in your plan.` }
  }

  if (limit === 0) {
    return { allowed: true, remaining: 0, covered: false, message: `${label} consultations not included — standard rate applies.` }
  }

  const usage = await getOrCreateUsage(subscription.id)
  const usageData = (usage.usageData ?? {}) as Record<string, number>
  const used = usageData[key] ?? 0

  if (used < limit) {
    // Increment usage
    const newData = { ...usageData, [key]: used + 1 }
    await prisma.subscriptionUsage.update({
      where: { id: usage.id },
      data: { usageData: newData },
    })
    return {
      allowed: true,
      remaining: limit - used - 1,
      covered: true,
      message: `Free ${label} consultation (${limit - used - 1} remaining this month).`,
    }
  }

  return { allowed: true, remaining: 0, covered: false, message: `Monthly ${label} consultations used — standard rate applies.` }
}

/**
 * Get the subscription discount for a service.
 * Checks: per-service SubscriptionPlanService → plan discounts JSON (by role:specialty or category)
 */
export async function getSubscriptionDiscount(
  userId: string,
  serviceType: string,
  platformServiceId?: string,
  provider?: ConsultProvider
): Promise<{ discountPercent: number; message: string }> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    select: {
      status: true,
      planId: true,
      plan: { select: { discounts: true, name: true } },
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
      where: { planId: subscription.planId, platformServiceId },
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
  if (discounts) {
    // Check role:specialty key (e.g. "DOCTOR:Cardiology")
    if (provider?.specialty && discounts[`${provider.role}:${provider.specialty}`] > bestDiscount) {
      bestDiscount = discounts[`${provider.role}:${provider.specialty}`]
      source = `${provider.specialty} discount`
    }
    // Check role key (e.g. "DOCTOR")
    if (provider?.role && discounts[provider.role] && discounts[provider.role] > bestDiscount) {
      bestDiscount = discounts[provider.role]
      source = `${provider.role} discount`
    }
    // Check service type key (e.g. "lab", "pharmacy")
    if (discounts[serviceType] && discounts[serviceType] > bestDiscount) {
      bestDiscount = discounts[serviceType]
      source = 'plan discount'
    }
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
          quotas: true,
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

  const quotas = (subscription.plan.quotas ?? []) as Array<{ role: string; specialty?: string | null; limit: number }>
  const usageData = (usage?.usageData ?? {}) as Record<string, number>

  // Build usage summary from quotas
  const quotaSummary = quotas
    .filter(q => q.limit !== 0)
    .map(q => {
      const key = q.specialty ? `${q.role}:${q.specialty}` : q.role
      const label = q.specialty || q.role
      return {
        key,
        label,
        used: usageData[key] ?? 0,
        limit: q.limit,
      }
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
      quotas: quotaSummary,
    },
  }
}
