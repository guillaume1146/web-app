import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * GET /api/services/catalog
 * Returns the unified platform service catalog grouped by provider type and category.
 * Used by regional admin to build subscription plans with real service references.
 *
 * Query params:
 *   ?providerType=DOCTOR — filter by provider type
 *   ?countryCode=MU — include country-specific + global services
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const providerType = searchParams.get('providerType')
    const countryCode = searchParams.get('countryCode')

    const where: Record<string, unknown> = { isActive: true }
    if (providerType) {
      where.providerType = providerType
    }
    if (countryCode) {
      where.OR = [{ countryCode }, { countryCode: null }]
    }

    const services = await prisma.platformService.findMany({
      where,
      orderBy: [{ providerType: 'asc' }, { category: 'asc' }, { serviceName: 'asc' }],
      select: {
        id: true,
        providerType: true,
        serviceName: true,
        category: true,
        description: true,
        defaultPrice: true,
        currency: true,
        duration: true,
        isDefault: true,
        countryCode: true,
      },
    })

    // Group by providerType — category
    const grouped: Record<string, { id: string; serviceName: string; defaultPrice: number; description: string; duration: number | null; isDefault: boolean }[]> = {}

    for (const svc of services) {
      const key = `${svc.providerType} — ${svc.category}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push({
        id: svc.id,
        serviceName: svc.serviceName,
        defaultPrice: svc.defaultPrice,
        description: svc.description,
        duration: svc.duration,
        isDefault: svc.isDefault,
      })
    }

    const data = Object.entries(grouped).map(([category, items]) => ({
      category,
      services: items,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/services/catalog error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
