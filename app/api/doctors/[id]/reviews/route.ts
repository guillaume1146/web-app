import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic } from '@/lib/rate-limit'

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, 'Comment is required').max(1000, 'Comment must be 1000 characters or less'),
})

/**
 * GET /api/doctors/[id]/reviews
 * List reviews for a doctor (public, paginated).
 * The `id` param is the doctor profile ID.
 * Supports `limit` and `offset` query params (limit capped at 50).
 * Returns reviews ordered by date desc and an averageRating.
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
    // Resolve doctor profile ID — `id` can be either User.id or DoctorProfile.id
    const profileByUser = await prisma.doctorProfile.findUnique({
      where: { userId: id },
      select: { id: true },
    })
    const doctorProfileId = profileByUser?.id ?? id

    const [reviews, total, aggregation] = await Promise.all([
      prisma.patientComment.findMany({
        where: { doctorId: doctorProfileId },
        select: {
          id: true,
          patientName: true,
          rating: true,
          comment: true,
          date: true,
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.patientComment.count({ where: { doctorId: doctorProfileId } }),
      prisma.patientComment.aggregate({
        where: { doctorId: doctorProfileId },
        _avg: { rating: true },
      }),
    ])

    const averageRating = aggregation._avg.rating
      ? Math.round(aggregation._avg.rating * 10) / 10
      : 0

    return NextResponse.json({
      success: true,
      data: reviews,
      total,
      limit,
      offset,
      averageRating,
    })
  } catch (error) {
    console.error('Doctor reviews fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

/**
 * POST /api/doctors/[id]/reviews
 * Submit a review for a doctor. Auth required.
 * The `id` param is the doctor profile ID.
 * patientName is auto-set from the authenticated user's name.
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
    // Verify the doctor profile exists
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get the authenticated user's name for patientName
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { firstName: true, lastName: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const patientName = `${user.firstName} ${user.lastName}`

    const review = await prisma.patientComment.create({
      data: {
        doctorId: id,
        patientName,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      select: {
        id: true,
        patientName: true,
        rating: true,
        comment: true,
        date: true,
      },
    })

    return NextResponse.json({ success: true, data: review }, { status: 201 })
  } catch (error) {
    console.error('Doctor review create error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
