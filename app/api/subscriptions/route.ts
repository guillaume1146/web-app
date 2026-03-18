import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/subscriptions
 * Returns all active subscription plans, optionally filtered by type and countryCode.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'individual' | 'corporate' | null (all)
    const countryCode = searchParams.get('countryCode') // 'MU', 'MG', etc.

    // Build where clause — AND all conditions together
    const conditions: Record<string, unknown>[] = [{ isActive: true }]
    if (type === 'individual' || type === 'corporate') {
      conditions.push({ type })
    }
    if (countryCode) {
      conditions.push({ OR: [{ countryCode }, { countryCode: null }] })
    }
    const where = conditions.length === 1 ? conditions[0] : { AND: conditions }

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
        countryCode: true,
        targetAudience: true,
        quotas: true,
        discounts: true,
        features: true,
        isActive: true,
        planServices: {
          select: {
            isFree: true,
            discountPercent: true,
            adminPrice: true,
            monthlyLimit: true,
            platformService: {
              select: { id: true, serviceName: true, category: true, defaultPrice: true, providerType: true },
            },
            serviceGroup: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    console.error('GET /api/subscriptions error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
