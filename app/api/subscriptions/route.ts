import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/subscriptions
 * Returns all active subscription plans, grouped by type.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'individual' | 'corporate' | null (all)

    const where: Record<string, unknown> = { isActive: true }
    if (type === 'individual' || type === 'corporate') {
      where.type = type
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { price: 'asc' },
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

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    console.error('GET /api/subscriptions error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
