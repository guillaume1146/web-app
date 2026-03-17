import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'

/**
 * GET /api/admin/required-documents
 * Returns all required document configurations grouped by userType.
 */
export async function GET(request: NextRequest) {
  const auth = validateRequest(request)
  if (!auth || !['admin', 'regional-admin'].includes(auth.userType)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const configs = await prisma.requiredDocumentConfig.findMany({
      orderBy: [{ userType: 'asc' }, { documentName: 'asc' }],
    })

    const grouped: Record<string, { documentName: string; required: boolean }[]> = {}
    for (const config of configs) {
      if (!grouped[config.userType]) grouped[config.userType] = []
      grouped[config.userType].push({ documentName: config.documentName, required: config.required })
    }

    return NextResponse.json({ success: true, data: grouped, raw: configs })
  } catch (error) {
    console.error('Required documents fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/required-documents
 * Upsert required document configurations. Super admin only.
 * Body: { configs: [{ userType, documentName, required }] }
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
      configs.map((c: { userType: string; documentName: string; required: boolean }) =>
        prisma.requiredDocumentConfig.upsert({
          where: { userType_documentName: { userType: c.userType, documentName: c.documentName } },
          update: { required: c.required },
          create: { userType: c.userType, documentName: c.documentName, required: c.required },
        })
      )
    )

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('Required documents update error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
