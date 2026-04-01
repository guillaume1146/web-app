import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * PATCH /api/specialties/[id]
 * Update a specialty. Regional admin or super admin only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (!['regional-admin', 'admin'].includes(auth.userType)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const existing = await prisma.providerSpecialty.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Specialty not found' }, { status: 404 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (body.name && typeof body.name === 'string' && body.name.trim().length >= 2) {
      data.name = body.name.trim()
    }
    if (typeof body.description === 'string') {
      data.description = body.description.trim() || null
    }
    if (typeof body.isActive === 'boolean') {
      data.isActive = body.isActive
    }
    if (typeof body.icon === 'string') {
      data.icon = body.icon.trim() || null
    }

    const updated = await prisma.providerSpecialty.update({
      where: { id },
      data,
      select: { id: true, providerType: true, name: true, description: true, icon: true, isActive: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/specialties/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/specialties/[id]
 * Soft-delete a specialty (set isActive=false). Regional admin or super admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  if (!['regional-admin', 'admin'].includes(auth.userType)) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const existing = await prisma.providerSpecialty.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Specialty not found' }, { status: 404 })
    }

    await prisma.providerSpecialty.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Specialty deactivated' })
  } catch (error) {
    console.error('DELETE /api/specialties/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
