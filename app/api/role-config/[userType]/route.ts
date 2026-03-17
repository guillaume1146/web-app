import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/**
 * GET /api/role-config/[userType]
 * Returns enabled feature keys for a given user type.
 * Public endpoint — used by sidebar to filter visible items.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userType: string }> }
) {
  const { userType } = await params

  try {
    const configs = await prisma.roleFeatureConfig.findMany({
      where: { userType: userType.toUpperCase() },
      select: { featureKey: true, enabled: true },
    })

    // If no config exists for this role, all features are enabled by default
    if (configs.length === 0) {
      return NextResponse.json({ success: true, data: { allEnabled: true, features: {} } })
    }

    const features: Record<string, boolean> = {}
    for (const config of configs) {
      features[config.featureKey] = config.enabled
    }

    return NextResponse.json({ success: true, data: { allEnabled: false, features } })
  } catch (error) {
    console.error('Role config fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
