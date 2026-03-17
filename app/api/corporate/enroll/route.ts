import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { enrollEmployeesInPlan, calculateCorporatePlanCost } from '@/lib/subscription/corporate'
import prisma from '@/lib/db'

/**
 * POST /api/corporate/enroll
 * Corporate admin enrolls all active employees in a corporate plan.
 * The corporate admin's wallet is debited for the total cost (with volume discount).
 *
 * Body: { planId: string }
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a corporate admin
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { userType: true },
    })
    if (user?.userType !== 'CORPORATE_ADMIN') {
      return NextResponse.json({ success: false, message: 'Only corporate administrators can enroll employees' }, { status: 403 })
    }

    const body = await request.json()
    const { planId } = body as { planId: string }

    if (!planId) {
      return NextResponse.json({ success: false, message: 'Plan ID is required' }, { status: 400 })
    }

    const result = await enrollEmployeesInPlan({
      corporateAdminUserId: auth.sub,
      planId,
    })

    if (!result.success) {
      const status = result.error === 'INSUFFICIENT_BALANCE' ? 402
        : result.error === 'WALLET_NOT_FOUND' ? 404
        : 400
      return NextResponse.json({ success: false, message: result.error }, { status })
    }

    return NextResponse.json({
      success: true,
      data: {
        enrolled: result.enrolled,
        totalCost: result.totalCost,
      },
      message: `${result.enrolled} employees enrolled successfully`,
    })
  } catch (error) {
    console.error('POST /api/corporate/enroll error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/corporate/enroll?planId=xxx
 * Preview corporate plan cost with volume discount (no actual enrollment).
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')
    if (!planId) {
      return NextResponse.json({ success: false, message: 'planId query param required' }, { status: 400 })
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { price: true, name: true, discounts: true },
    })
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
    }

    const employeeCount = await prisma.corporateEmployee.count({
      where: { corporateAdminId: auth.sub, status: 'active' },
    })

    const costInfo = calculateCorporatePlanCost({
      planPrice: plan.price,
      employeeCount,
      discounts: plan.discounts as Record<string, number> | null,
    })

    return NextResponse.json({
      success: true,
      data: {
        planName: plan.name,
        employeeCount,
        ...costInfo,
      },
    })
  } catch (error) {
    console.error('GET /api/corporate/enroll error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
