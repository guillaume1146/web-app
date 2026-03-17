import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { getUsageSummary } from '@/lib/subscription/usage'

/**
 * GET /api/users/[id]/subscription
 * Returns the user's active subscription plan and current month usage.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const summary = await getUsageSummary(id)
    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    console.error('GET /api/users/[id]/subscription error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/users/[id]/subscription
 * Subscribe to a plan, change plan, or cancel subscription.
 * Body: { action: 'subscribe' | 'change' | 'cancel', planId?: string }
 *
 * For individual plans: debits the user's own wallet.
 * For corporate-sponsored plans: the subscription was paid by the corporate admin
 * via enrollEmployeesInPlan() — this endpoint only handles individual subscriptions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, planId } = body as { action: string; planId?: string }

    if (action === 'cancel') {
      const sub = await prisma.userSubscription.findUnique({ where: { userId: id } })
      if (!sub) {
        return NextResponse.json({ success: false, message: 'No active subscription' }, { status: 404 })
      }
      // Cannot cancel a corporate-sponsored subscription individually
      if (sub.corporateAdminId) {
        return NextResponse.json({
          success: false,
          message: 'This subscription is managed by your employer. Contact your corporate administrator.',
        }, { status: 403 })
      }
      await prisma.userSubscription.update({
        where: { userId: id },
        data: { status: 'cancelled', endDate: new Date() },
      })
      return NextResponse.json({ success: true, message: 'Subscription cancelled' })
    }

    if (!planId) {
      return NextResponse.json({ success: false, message: 'Plan ID is required' }, { status: 400 })
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, price: true, name: true, type: true },
    })
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
    }

    // Individual users cannot subscribe to corporate plans directly
    if (plan.type === 'corporate') {
      return NextResponse.json({
        success: false,
        message: 'Corporate plans can only be purchased by corporate administrators for their employees.',
      }, { status: 400 })
    }

    if (action === 'subscribe' || action === 'change') {
      await prisma.$transaction(async (tx) => {
        // Upsert subscription (individual — no corporateAdminId)
        await tx.userSubscription.upsert({
          where: { userId: id },
          update: {
            planId: plan.id,
            status: 'active',
            startDate: new Date(),
            endDate: null,
            autoRenew: true,
            corporateAdminId: null, // Clear any previous corporate link
          },
          create: {
            userId: id,
            planId: plan.id,
            status: 'active',
            startDate: new Date(),
            autoRenew: true,
          },
        })

        // Debit user's own wallet for first month
        if (plan.price > 0) {
          const wallet = await tx.userWallet.findUnique({
            where: { userId: id },
            select: { id: true, balance: true },
          })
          if (wallet && wallet.balance >= plan.price) {
            const newBalance = wallet.balance - plan.price
            await tx.userWallet.update({
              where: { id: wallet.id },
              data: { balance: newBalance },
            })
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'debit',
                amount: plan.price,
                description: `Subscription — ${plan.name}`,
                serviceType: 'subscription',
                referenceId: plan.id,
                balanceBefore: wallet.balance,
                balanceAfter: newBalance,
                status: 'completed',
              },
            })
          }
        }
      })

      return NextResponse.json({ success: true, message: `Subscribed to ${plan.name}` })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/users/[id]/subscription error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
