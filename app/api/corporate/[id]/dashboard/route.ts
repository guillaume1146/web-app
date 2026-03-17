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
    const [corporateProfile, wallet, billingRecords, walletTx, notifications] = await Promise.all([
      prisma.corporateAdminProfile.findUnique({
        where: { userId: id },
        select: { id: true, companyName: true, employeeCount: true, industry: true, registrationNumber: true },
      }),
      prisma.userWallet.findUnique({ where: { userId: id }, select: { balance: true } }),
      prisma.billingInfo.findMany({
        where: { userId: id },
        select: { id: true, type: true, lastFour: true, cardHolder: true, isDefault: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.walletTransaction.findMany({
        where: { wallet: { userId: id } },
        select: { id: true, type: true, amount: true, description: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.notification.findMany({
        where: { userId: id, readAt: null },
        select: { id: true, type: true, title: true, message: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    if (!corporateProfile) return NextResponse.json({ success: false, message: 'Corporate profile not found' }, { status: 404 })

    // Compute claim stats from the corporate user's wallet transactions tagged as insurance
    // and from InsuranceClaims related to patients who have this corporate user as referrer.
    // Since CorporateAdminProfile has no direct FK to InsuranceClaim in the schema, we derive
    // stats from wallet transactions (CREDIT = approved, others = pending/contributions).
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const allTx = await prisma.walletTransaction.findMany({
      where: { wallet: { userId: id } },
      select: { type: true, amount: true, description: true, status: true, createdAt: true },
    })

    // Monthly contribution = sum of DEBIT transactions this month (outgoing payments for claims/premiums)
    const monthlyContribution = allTx
      .filter(tx => {
        const txDate = new Date(tx.createdAt)
        return (tx.type === 'DEBIT' || tx.type === 'debit') && txDate >= monthStart
      })
      .reduce((sum, tx) => sum + tx.amount, 0)

    // Derive claim-like stats from transaction descriptions / statuses
    // Approved = CREDIT transactions (reimbursements received)
    const approvedClaims = allTx.filter(tx => tx.type === 'CREDIT' || tx.type === 'credit').length
    // Pending = DEBIT transactions with status pending
    const pendingClaims = allTx.filter(
      tx => tx.status === 'pending' && (tx.type === 'DEBIT' || tx.type === 'debit')
    ).length
    // Rejected = DEBIT transactions with status failed
    const rejectedClaims = allTx.filter(tx => tx.status === 'failed').length

    // Active policy holders = employeeCount from profile (best available approximation)
    const activePolicyHolders = corporateProfile.employeeCount || 0

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalEmployees: corporateProfile.employeeCount || 0,
          activePolicyHolders,
          pendingClaims,
          approvedClaims,
          rejectedClaims,
          monthlyContribution,
          totalClaims: approvedClaims + pendingClaims + rejectedClaims,
          companyName: corporateProfile.companyName || '',
          industry: corporateProfile.industry || '',
          registrationNumber: corporateProfile.registrationNumber || '',
          walletBalance: wallet?.balance || 0,
        },
        billingMethods: billingRecords,
        recentTransactions: walletTx.map(tx => ({
          id: tx.id,
          date: tx.createdAt.toISOString().slice(0, 10),
          description: tx.description,
          amount: tx.amount,
          status: tx.status,
          type: tx.type,
        })),
        notifications,
      },
    })
  } catch (error) {
    console.error('Corporate dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
