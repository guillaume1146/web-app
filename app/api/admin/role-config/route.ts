import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

/**
 * GET /api/admin/role-config
 * Returns all role feature configurations grouped by userType.
 */
export async function GET(request: NextRequest) {
  const auth = validateRequest(request)
  if (!auth || !['admin', 'regional-admin'].includes(auth.userType)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const configs = await prisma.roleFeatureConfig.findMany({
      orderBy: [{ userType: 'asc' }, { featureKey: 'asc' }],
    })

    // Group by userType
    const grouped: Record<string, Record<string, boolean>> = {}
    for (const config of configs) {
      if (!grouped[config.userType]) grouped[config.userType] = {}
      grouped[config.userType][config.featureKey] = config.enabled
    }

    return NextResponse.json({ success: true, data: grouped, raw: configs })
  } catch (error) {
    console.error('Role config fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/role-config
 * Upsert role feature configurations. Super admin only.
 * Body: { configs: [{ userType, featureKey, enabled }] }
 */
export async function PUT(request: NextRequest) {
  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  try {
    const { configs } = await request.json()

    if (!Array.isArray(configs)) {
      return NextResponse.json({ success: false, message: 'configs must be an array' }, { status: 400 })
    }

    const results = await prisma.$transaction(
      configs.map((c: { userType: string; featureKey: string; enabled: boolean }) =>
        prisma.roleFeatureConfig.upsert({
          where: { userType_featureKey: { userType: c.userType, featureKey: c.featureKey } },
          update: { enabled: c.enabled },
          create: { userType: c.userType, featureKey: c.featureKey, enabled: c.enabled },
        })
      )
    )

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Role config update error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
