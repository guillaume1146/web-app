import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { z } from 'zod'

/**
 * GET /api/regional/roles
 * Returns all provider roles (public-facing) or admin-filtered.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const isProviderOnly = searchParams.get('isProvider') === 'true'
    const searchOnly = searchParams.get('searchEnabled') === 'true'

    const roles = await prisma.providerRole.findMany({
      where: {
        isActive: true,
        ...(isProviderOnly ? { isProvider: true } : {}),
        ...(searchOnly ? { searchEnabled: true } : {}),
      },
      include: {
        verificationDocs: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    })

    return NextResponse.json({ success: true, data: roles })
  } catch (error) {
    console.error('GET /api/regional/roles error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

const createRoleSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[A-Z][A-Z0-9_]*$/, 'Code must be UPPER_CASE with underscores'),
  label: z.string().min(1).max(100),
  singularLabel: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z][a-z0-9-]*$/, 'Slug must be lowercase with hyphens'),
  icon: z.string().min(1).default('FaUserMd'),
  color: z.string().min(1).default('#0C6780'),
  cardImage: z.string().nullable().optional(),
  description: z.string().optional(),
  searchEnabled: z.boolean().default(true),
  bookingEnabled: z.boolean().default(true),
  inventoryEnabled: z.boolean().default(true),
  displayOrder: z.number().int().default(100),
  verificationDocs: z.array(z.object({
    documentName: z.string().min(1),
    description: z.string().optional(),
    isRequired: z.boolean().default(true),
  })).default([]),
})

/**
 * POST /api/regional/roles
 * Regional admin creates a new provider role.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify regional admin
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { userType: true, regionId: true },
    })

    if (!user || user.userType !== 'REGIONAL_ADMIN') {
      return NextResponse.json({ success: false, message: 'Only regional admins can create roles' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const { verificationDocs, ...roleData } = parsed.data

    // Check uniqueness
    const existingCode = await prisma.providerRole.findUnique({ where: { code: roleData.code } })
    if (existingCode) {
      return NextResponse.json({ success: false, message: `Role code "${roleData.code}" already exists` }, { status: 409 })
    }
    const existingSlug = await prisma.providerRole.findUnique({ where: { slug: roleData.slug } })
    if (existingSlug) {
      return NextResponse.json({ success: false, message: `Slug "${roleData.slug}" already exists` }, { status: 409 })
    }

    // Get region code
    let regionCode: string | null = null
    if (user.regionId) {
      const region = await prisma.region.findUnique({ where: { id: user.regionId }, select: { countryCode: true } })
      regionCode = region?.countryCode ?? null
    }

    const role = await prisma.providerRole.create({
      data: {
        ...roleData,
        isProvider: true,
        urlPrefix: `/provider/${roleData.slug}`,
        cookieValue: roleData.slug,
        regionCode,
        createdByAdminId: auth.sub,
        verificationDocs: {
          create: verificationDocs.map((doc, i) => ({
            documentName: doc.documentName,
            description: doc.description,
            isRequired: doc.isRequired,
            displayOrder: i,
          })),
        },
      },
      include: { verificationDocs: true },
    })

    return NextResponse.json({ success: true, data: role }, { status: 201 })
  } catch (error) {
    console.error('POST /api/regional/roles error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
