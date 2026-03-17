import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * GET /api/services/my-services
 * Returns the current provider's services with their configs and effective prices.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const configs = await prisma.providerServiceConfig.findMany({
      where: { providerUserId: auth.sub },
      include: {
        platformService: {
          select: {
            id: true,
            serviceName: true,
            category: true,
            description: true,
            defaultPrice: true,
            currency: true,
            duration: true,
            isDefault: true,
          },
        },
      },
      orderBy: { platformService: { category: 'asc' } },
    })

    const data = configs.map(cfg => ({
      configId: cfg.id,
      platformServiceId: cfg.platformServiceId,
      serviceName: cfg.platformService.serviceName,
      category: cfg.platformService.category,
      description: cfg.platformService.description,
      defaultPrice: cfg.platformService.defaultPrice,
      priceOverride: cfg.priceOverride,
      effectivePrice: cfg.priceOverride ?? cfg.platformService.defaultPrice,
      currency: cfg.platformService.currency,
      duration: cfg.platformService.duration,
      isDefault: cfg.platformService.isDefault,
      isActive: cfg.isActive,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/services/my-services error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/services/my-services
 * Update provider's price override or active status for a service.
 * Body: { configId: string, priceOverride?: number | null, isActive?: boolean }
 */
export async function PATCH(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configId, priceOverride, isActive } = body as {
      configId: string
      priceOverride?: number | null
      isActive?: boolean
    }

    if (!configId) {
      return NextResponse.json({ success: false, message: 'configId is required' }, { status: 400 })
    }

    // Verify ownership
    const config = await prisma.providerServiceConfig.findUnique({
      where: { id: configId },
      select: { providerUserId: true },
    })

    if (!config || config.providerUserId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Service config not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (priceOverride !== undefined) updateData.priceOverride = priceOverride
    if (isActive !== undefined) updateData.isActive = isActive

    const updated = await prisma.providerServiceConfig.update({
      where: { id: configId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/services/my-services error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
