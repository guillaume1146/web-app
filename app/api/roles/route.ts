import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/roles
 * Returns all active provider roles from ProviderRole table (DB-driven).
 * Used by: sidebar search links, registration page, provider search.
 * Query params:
 *   - searchEnabled=true: only roles visible in patient search
 *   - isProvider=true: only provider roles (excludes patient, admin)
 *   - all=true: include non-active roles
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const searchOnly = searchParams.get('searchEnabled') === 'true'
    const providerOnly = searchParams.get('isProvider') === 'true'
    const includeAll = searchParams.get('all') === 'true'

    // Get roles from ProviderRole table (DB-driven, configurable by regional admin)
    const roles = await prisma.providerRole.findMany({
      where: {
        ...(!includeAll ? { isActive: true } : {}),
        ...(searchOnly ? { searchEnabled: true } : {}),
        ...(providerOnly ? { isProvider: true } : {}),
      },
      include: {
        verificationDocs: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { displayOrder: 'asc' },
    })

    // Get provider counts per type
    const providerCounts = await prisma.user.groupBy({
      by: ['userType'],
      where: { accountStatus: 'active' },
      _count: true,
    })
    const countMap = new Map(providerCounts.map(c => [c.userType as string, c._count]))

    // Get specialties per type
    const specialties = await prisma.providerSpecialty.findMany({
      where: { isActive: true },
      orderBy: [{ providerType: 'asc' }, { name: 'asc' }],
      select: { providerType: true, name: true, description: true, icon: true },
    })
    const specMap = new Map<string, { name: string; description: string | null; icon: string | null }[]>()
    for (const s of specialties) {
      if (!specMap.has(s.providerType)) specMap.set(s.providerType, [])
      specMap.get(s.providerType)!.push({ name: s.name, description: s.description, icon: s.icon })
    }

    const data = roles.map(role => ({
      id: role.id,
      code: role.code,
      label: role.label,
      singularLabel: role.singularLabel,
      slug: role.slug,
      icon: role.icon,
      color: role.color,
      cardImage: role.cardImage,
      description: role.description,
      searchEnabled: role.searchEnabled,
      bookingEnabled: role.bookingEnabled,
      inventoryEnabled: role.inventoryEnabled,
      isProvider: role.isProvider,
      isActive: role.isActive,
      displayOrder: role.displayOrder,
      urlPrefix: role.urlPrefix,
      cookieValue: role.cookieValue,
      searchPath: `/search/${role.slug}`,
      providerCount: countMap.get(role.code) ?? 0,
      specialties: specMap.get(role.code) ?? [],
      verificationDocs: role.verificationDocs,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/roles error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
