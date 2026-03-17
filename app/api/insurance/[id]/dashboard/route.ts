import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.sub !== id) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  try {
    const insuranceProfile = await prisma.insuranceRepProfile.findUnique({
      where: { userId: id },
      select: { id: true, companyName: true }
    })
    if (!insuranceProfile) return NextResponse.json({ success: false, message: 'Insurance profile not found' }, { status: 404 })

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [plans, wallet, walletTx, claimCounts] = await Promise.all([
      prisma.insurancePlanListing.findMany({
        where: { insuranceRepId: insuranceProfile.id },
        select: { id: true, planName: true, planType: true, monthlyPremium: true, coverageAmount: true, isActive: true, updatedAt: true }
      }),
      prisma.userWallet.findUnique({ where: { userId: id }, select: { balance: true } }),
      prisma.walletTransaction.findMany({
        where: {
          wallet: { userId: id },
          createdAt: { gte: monthStart },
          type: { in: ['CREDIT', 'credit'] },
          status: 'completed',
        },
        select: { amount: true },
      }),
      prisma.insuranceClaim.groupBy({
        by: ['status'],
        where: { insuranceRepId: insuranceProfile.id },
        _count: { status: true },
      }),
    ])

    const activePlans = plans.filter(p => p.isActive)

    // Monthly commission = sum of CREDIT wallet transactions this month
    const monthlyCommission = walletTx.reduce((sum, tx) => sum + tx.amount, 0)

    // Expiring policies: plans inactive or updated > 11 months ago (approximate expiry proxy)
    const elevenMonthsAgo = new Date(now.getTime() - 335 * 24 * 60 * 60 * 1000)
    const expiringPolicies = plans.filter(p => p.isActive && new Date(p.updatedAt) <= elevenMonthsAgo).length

    // Claim approval rate
    const approvedCount = claimCounts.find(c => c.status === 'approved')?._count.status || 0
    const rejectedCount = claimCounts.find(c => c.status === 'rejected')?._count.status || 0
    const decidedCount = approvedCount + rejectedCount
    const claimApprovalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          activePolicies: activePlans.length,
          totalPlans: plans.length,
          walletBalance: wallet?.balance || 0,
          monthlyCommission,
          expiringPolicies,
          claimApprovalRate,
        },
        plans: plans.map(p => ({
          id: p.id,
          planName: p.planName,
          planType: p.planType,
          premium: p.monthlyPremium,
          coverageAmount: p.coverageAmount,
          isActive: p.isActive,
        })),
      }
    })
  } catch (error) {
    console.error('Insurance dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
