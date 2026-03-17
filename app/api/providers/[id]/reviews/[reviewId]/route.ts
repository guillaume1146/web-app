import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

/**
 * PATCH /api/providers/[id]/reviews/[reviewId]
 * Allow the provider to respond to a review, or a reviewer to mark helpful.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id, reviewId } = await params

  try {
    const review = await prisma.providerReview.findUnique({
      where: { id: reviewId },
      select: { id: true, providerUserId: true },
    })

    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
    }

    const body = await request.json()

    // Provider responding to the review
    if (body.response !== undefined) {
      if (review.providerUserId !== auth.sub) {
        return NextResponse.json({ success: false, message: 'Only the provider can respond' }, { status: 403 })
      }

      const updated = await prisma.providerReview.update({
        where: { id: reviewId },
        data: {
          response: body.response,
          respondedAt: new Date(),
        },
        select: { id: true, response: true, respondedAt: true },
      })

      return NextResponse.json({ success: true, data: updated })
    }

    // Mark as helpful
    if (body.helpful === true) {
      const updated = await prisma.providerReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
        select: { id: true, helpfulCount: true },
      })

      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, message: 'No valid action provided' }, { status: 400 })
  } catch (error) {
    console.error('Review update error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
