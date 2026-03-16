import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/subscriptions/[id]
 * Returns a single subscription plan by ID or slug.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const { id } = await params

  try {
    // Try by ID first, then by slug
    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        price: true,
        currency: true,
        gpConsultsPerMonth: true,
        specialistConsultsPerMonth: true,
        features: true,
        isActive: true,
      },
    })

    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    console.error('GET /api/subscriptions/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
