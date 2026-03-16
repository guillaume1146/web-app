import prisma from '@/lib/db'

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
  consultType: 'gp' | 'specialist'
): Promise<{ allowed: boolean; remaining: number; message: string }> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      plan: {
        select: {
          gpConsultsPerMonth: true,
          specialistConsultsPerMonth: true,
          name: true,
        },
      },
    },
  })

  // No active subscription — allow but charge full price
  if (!subscription || subscription.status !== 'active') {
    return { allowed: true, remaining: 0, message: 'No active subscription — full price applies.' }
  }

  const usage = await getOrCreateUsage(subscription.id)
  const plan = subscription.plan

  if (consultType === 'gp') {
    const limit = plan.gpConsultsPerMonth
    // -1 = unlimited
    if (limit === -1) {
      return { allowed: true, remaining: -1, message: 'Unlimited GP consultations included in your plan.' }
    }
    const used = usage.gpConsultsUsed
    if (used < limit) {
      // Increment usage
      await prisma.subscriptionUsage.update({
        where: { id: usage.id },
        data: { gpConsultsUsed: { increment: 1 } },
      })
      return { allowed: true, remaining: limit - used - 1, message: `Free GP consultation (${limit - used - 1} remaining this month).` }
    }
    return { allowed: true, remaining: 0, message: 'Monthly GP consultations used — standard rate applies.' }
  }

  // Specialist
  const limit = plan.specialistConsultsPerMonth
  if (limit === -1) {
    return { allowed: true, remaining: -1, message: 'Unlimited specialist consultations included in your plan.' }
  }
  const used = usage.specialistConsultsUsed
  if (used < limit) {
    await prisma.subscriptionUsage.update({
      where: { id: usage.id },
      data: { specialistConsultsUsed: { increment: 1 } },
    })
    return { allowed: true, remaining: limit - used - 1, message: `Free specialist consultation (${limit - used - 1} remaining this month).` }
  }
  return { allowed: true, remaining: 0, message: 'Monthly specialist consultations used — standard rate applies.' }
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
      gpConsultsLimit: subscription.plan.gpConsultsPerMonth,
      specialistConsultsLimit: subscription.plan.specialistConsultsPerMonth,
    },
  }
}
