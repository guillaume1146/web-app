import { NextRequest, NextResponse } from 'next/server'
import { UserType } from '@prisma/client'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitPublic, rateLimitAuth } from '@/lib/rate-limit'

/**
 * GET /api/specialties
 * Public endpoint — returns specialties, optionally filtered by provider type.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const providerType = searchParams.get('providerType')

  try {
    const where: Record<string, unknown> = { isActive: true }
    if (providerType) where.providerType = providerType.toUpperCase() as UserType

    const specialties = await prisma.providerSpecialty.findMany({
      where,
      select: {
        id: true,
        providerType: true,
        name: true,
        description: true,
        isActive: true,
      },
      orderBy: [{ providerType: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: specialties })
  } catch (error) {
    console.error('GET /api/specialties error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/specialties
 * Create a new specialty. Regional admin or super admin only.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  // Only regional-admin or admin can create specialties
  if (!['regional-admin', 'admin'].includes(auth.userType)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { providerType, name, description } = body

    if (!providerType || typeof providerType !== 'string') {
      return NextResponse.json({ success: false, message: 'providerType is required' }, { status: 400 })
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'name is required (min 2 characters)' }, { status: 400 })
    }

    // Check duplicate
    const existing = await prisma.providerSpecialty.findFirst({
      where: { providerType: providerType.toUpperCase() as UserType, name: name.trim() },
    })
    if (existing) {
      return NextResponse.json({ success: false, message: 'Specialty already exists for this provider type' }, { status: 409 })
    }

    const specialty = await prisma.providerSpecialty.create({
      data: {
        providerType: providerType.toUpperCase() as UserType,
        name: name.trim(),
        description: description?.trim() || null,
      },
      select: { id: true, providerType: true, name: true, description: true, isActive: true },
    })

    return NextResponse.json({ success: true, data: specialty }, { status: 201 })
  } catch (error) {
    console.error('POST /api/specialties error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
