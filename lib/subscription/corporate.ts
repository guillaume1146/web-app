import prisma from '@/lib/db'

/**
 * Calculate the effective plan price for a corporate subscription,
 * applying volume discounts based on employee count.
 *
 * Volume discount keys in plan.discounts: volume_50, volume_100, volume_300, volume_1000
 * These are % off the plan price per employee.
 */
export function getVolumeDiscount(
  employeeCount: number,
  discounts: Record<string, number> | null
): { discountPercent: number; tier: string } {
  if (!discounts || employeeCount < 50) {
    return { discountPercent: 0, tier: 'standard' }
  }

  // Check tiers from highest to lowest
  if (employeeCount >= 1000 && discounts['volume_1000']) {
    return { discountPercent: discounts['volume_1000'], tier: '1000+' }
  }
  if (employeeCount >= 300 && discounts['volume_300']) {
    return { discountPercent: discounts['volume_300'], tier: '300-999' }
  }
  if (employeeCount >= 100 && discounts['volume_100']) {
    return { discountPercent: discounts['volume_100'], tier: '100-299' }
  }
  if (employeeCount >= 50 && discounts['volume_50']) {
    return { discountPercent: discounts['volume_50'], tier: '50-99' }
  }

  return { discountPercent: 0, tier: 'standard' }
}

/**
 * Calculate total monthly cost for a corporate plan.
 */
export function calculateCorporatePlanCost(params: {
  planPrice: number
  employeeCount: number
  discounts: Record<string, number> | null
}): {
  pricePerEmployee: number
  volumeDiscountPercent: number
  discountedPricePerEmployee: number
  totalMonthly: number
  tier: string
} {
  const { planPrice, employeeCount, discounts } = params
  const { discountPercent, tier } = getVolumeDiscount(employeeCount, discounts)

  const discountedPrice = discountPercent > 0
    ? Math.round(planPrice * (1 - discountPercent / 100))
    : planPrice

  return {
    pricePerEmployee: planPrice,
    volumeDiscountPercent: discountPercent,
    discountedPricePerEmployee: discountedPrice,
    totalMonthly: discountedPrice * employeeCount,
    tier,
  }
}

/**
 * Subscribe all active employees of a corporate admin to a plan.
 * The corporate admin's wallet is debited for the total cost.
 */
export async function enrollEmployeesInPlan(params: {
  corporateAdminUserId: string
  planId: string
}): Promise<{ success: boolean; enrolled: number; totalCost: number; error?: string }> {
  const { corporateAdminUserId, planId } = params

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
    select: { id: true, price: true, name: true, type: true, discounts: true },
  })

  if (!plan || plan.type !== 'corporate') {
    return { success: false, enrolled: 0, totalCost: 0, error: 'Invalid corporate plan' }
  }

  // Get active employees
  const employees = await prisma.corporateEmployee.findMany({
    where: { corporateAdminId: corporateAdminUserId, status: 'active' },
    select: { userId: true },
  })

  if (employees.length === 0) {
    return { success: false, enrolled: 0, totalCost: 0, error: 'No active employees' }
  }

  // Calculate cost with volume discount
  const costInfo = calculateCorporatePlanCost({
    planPrice: plan.price,
    employeeCount: employees.length,
    discounts: plan.discounts as Record<string, number> | null,
  })

  try {
    await prisma.$transaction(async (tx) => {
      // Debit corporate admin's wallet for total
      const adminWallet = await tx.userWallet.findUnique({
        where: { userId: corporateAdminUserId },
        select: { id: true, balance: true },
      })

      if (!adminWallet) throw new Error('WALLET_NOT_FOUND')
      if (adminWallet.balance < costInfo.totalMonthly) throw new Error('INSUFFICIENT_BALANCE')

      const newBalance = adminWallet.balance - costInfo.totalMonthly
      await tx.userWallet.update({
        where: { id: adminWallet.id },
        data: { balance: newBalance },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: adminWallet.id,
          type: 'debit',
          amount: costInfo.totalMonthly,
          description: `${plan.name} — ${employees.length} employees (${costInfo.tier} tier)`,
          serviceType: 'subscription',
          referenceId: plan.id,
          balanceBefore: adminWallet.balance,
          balanceAfter: newBalance,
          status: 'completed',
        },
      })

      // Create/update subscriptions for each employee
      for (const emp of employees) {
        await tx.userSubscription.upsert({
          where: { userId: emp.userId },
          update: {
            planId: plan.id,
            status: 'active',
            startDate: new Date(),
            endDate: null,
            autoRenew: true,
            corporateAdminId: corporateAdminUserId,
          },
          create: {
            userId: emp.userId,
            planId: plan.id,
            status: 'active',
            startDate: new Date(),
            autoRenew: true,
            corporateAdminId: corporateAdminUserId,
          },
        })
      }
    })

    return { success: true, enrolled: employees.length, totalCost: costInfo.totalMonthly }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, enrolled: 0, totalCost: 0, error: error.message }
    }
    return { success: false, enrolled: 0, totalCost: 0, error: 'Transaction failed' }
  }
}
