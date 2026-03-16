import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { z } from 'zod'

const topupSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(50000, 'Maximum top-up is Rs 50,000'),
  paymentMethod: z.enum(['mcb_juice', 'card']).optional().default('card'),
})

/**
 * POST /api/users/[id]/wallet/topup
 * Top up wallet balance. In production this would integrate with MCB Juice / card payment.
 * For now, directly credits the wallet (simulated payment).
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
    const parsed = topupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { amount, paymentMethod } = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.userWallet.findUnique({
        where: { userId: id },
        select: { id: true, balance: true },
      })

      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND')
      }

      const newBalance = wallet.balance + amount

      await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      })

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'credit',
          amount,
          description: `Wallet top-up via ${paymentMethod === 'mcb_juice' ? 'MCB Juice' : 'card'}`,
          serviceType: 'topup',
          balanceBefore: wallet.balance,
          balanceAfter: newBalance,
          status: 'completed',
        },
      })

      return { newBalance }
    })

    return NextResponse.json({
      success: true,
      data: { newBalance: result.newBalance },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') {
      return NextResponse.json({ success: false, message: 'Wallet not found' }, { status: 404 })
    }
    console.error('POST /api/users/[id]/wallet/topup error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
