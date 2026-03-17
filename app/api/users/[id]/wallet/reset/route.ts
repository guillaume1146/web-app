import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * POST /api/users/[id]/wallet/reset
 * Reset wallet balance to initial credit or a custom amount.
 * Infinite resets allowed (for development/testing purposes).
 *
 * Body (optional): { amount?: number }
 *   - If amount provided, resets to that specific amount
 *   - If not provided, resets to the initialCredit value
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
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
    // Parse optional custom amount from body
    let customAmount: number | null = null
    try {
      const body = await request.json()
      if (body?.amount && typeof body.amount === 'number' && body.amount > 0) {
        customAmount = body.amount
      }
    } catch {
      // No body or invalid JSON — use default
    }

    const wallet = await prisma.userWallet.findUnique({
      where: { userId: id },
      select: { id: true, balance: true, initialCredit: true },
    })

    if (!wallet) {
      return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 })
    }

    const resetAmount = customAmount ?? wallet.initialCredit
    const creditAmount = resetAmount - wallet.balance

    // Reset balance and create a transaction record
    const [updatedWallet] = await prisma.$transaction([
      prisma.userWallet.update({
        where: { userId: id },
        data: {
          balance: resetAmount,
          // Also update initialCredit if a custom amount was provided (for big corporate credits)
          ...(customAmount ? { initialCredit: customAmount } : {}),
        },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: Math.abs(creditAmount),
          description: customAmount
            ? `Dev trial reset — custom credit (${resetAmount.toLocaleString()})`
            : 'Trial balance reset',
          serviceType: 'TRIAL_RESET',
          balanceBefore: wallet.balance,
          balanceAfter: resetAmount,
          status: 'COMPLETED',
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        balance: updatedWallet.balance,
        initialCredit: updatedWallet.initialCredit,
      },
    })
  } catch (error) {
    console.error('POST /api/users/[id]/wallet/reset error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
