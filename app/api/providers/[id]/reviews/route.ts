import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

const REVIEWABLE_TYPES = ['DOCTOR', 'NURSE', 'NANNY', 'PHARMACIST', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER']

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, 'Comment is required').max(1000, 'Comment must be 1000 characters or less'),
})

/**
 * GET /api/providers/[id]/reviews
 * List reviews for any provider. The `id` param is the provider's User.id.
 * Supports `limit`, `offset`, and optional `providerType` query params.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const { id } = await params
  const { searchParams } = new URL(request.url)

  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const offsetParam = parseInt(searchParams.get('offset') || '0', 10)
  const limit = Math.min(Math.max(isNaN(limitParam) ? 20 : limitParam, 1), 50)
  const offset = Math.max(isNaN(offsetParam) ? 0 : offsetParam, 0)

  try {
    const where = { providerUserId: id }

    const [reviews, total, aggregation] = await Promise.all([
      prisma.providerReview.findMany({
        where,
        select: {
          id: true,
          reviewerUserId: true,
          reviewerUser: { select: { firstName: true, lastName: true, profileImage: true } },
          providerType: true,
          rating: true,
          comment: true,
          verified: true,
          helpfulCount: true,
          response: true,
          respondedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.providerReview.count({ where }),
      prisma.providerReview.aggregate({
        where,
        _avg: { rating: true },
      }),
    ])

    const averageRating = aggregation._avg.rating
      ? Math.round(aggregation._avg.rating * 10) / 10
      : 0

    // Build rating distribution
    const distribution = await prisma.providerReview.groupBy({
      by: ['rating'],
      where,
      _count: { rating: true },
    })
    const ratingDistribution = Object.fromEntries(
      [1, 2, 3, 4, 5].map(r => [r, distribution.find(d => d.rating === r)?._count.rating ?? 0])
    )

    return NextResponse.json({
      success: true,
      data: reviews.map(r => ({
        ...r,
        reviewerName: `${r.reviewerUser.firstName} ${r.reviewerUser.lastName}`,
        reviewerImage: r.reviewerUser.profileImage,
      })),
      total,
      limit,
      offset,
      averageRating,
      ratingDistribution,
    })
  } catch (error) {
    console.error('Provider reviews fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/providers/[id]/reviews
 * Submit a review for a provider. Auth required.
 * The `id` param is the provider's User.id.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    // Verify the provider exists and is a reviewable type
    const provider = await prisma.user.findUnique({
      where: { id },
      select: { id: true, userType: true },
    })

    if (!provider) {
      return NextResponse.json({ success: false, message: 'Provider not found' }, { status: 404 })
    }

    if (!REVIEWABLE_TYPES.includes(provider.userType)) {
      return NextResponse.json({ success: false, message: 'This user type cannot receive reviews' }, { status: 400 })
    }

    // Prevent self-review
    if (auth.sub === id) {
      return NextResponse.json({ success: false, message: 'Cannot review yourself' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const review = await prisma.providerReview.create({
      data: {
        providerUserId: id,
        reviewerUserId: auth.sub,
        providerType: provider.userType,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        providerType: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: review }, { status: 201 })
  } catch (error) {
    console.error('Provider review create error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
