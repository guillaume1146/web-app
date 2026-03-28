import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { z } from 'zod'

/**
 * GET /api/regional/roles/[id]
 * Get a single role with its verification docs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const role = await prisma.providerRole.findUnique({
      where: { id },
      include: { verificationDocs: { orderBy: { displayOrder: 'asc' } } },
    })

    if (!role) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: role })
  } catch (error) {
    console.error('GET /api/regional/roles/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

const updateRoleSchema = z.object({
  label: z.string().min(1).optional(),
  singularLabel: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  cardImage: z.string().nullable().optional(),
  description: z.string().optional(),
  searchEnabled: z.boolean().optional(),
  bookingEnabled: z.boolean().optional(),
  inventoryEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  verificationDocs: z.array(z.object({
    id: z.string().optional(),
    documentName: z.string().min(1),
    description: z.string().optional(),
    isRequired: z.boolean().default(true),
  })).optional(),
})

/**
 * PATCH /api/regional/roles/[id]
 * Update role metadata and verification docs.
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

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { userType: true },
    })

    if (!user || user.userType !== 'REGIONAL_ADMIN') {
      return NextResponse.json({ success: false, message: 'Only regional admins can update roles' }, { status: 403 })
    }

    const existing = await prisma.providerRole.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const { verificationDocs, ...roleData } = parsed.data

    // Update role
    const updated = await prisma.providerRole.update({
      where: { id },
      data: roleData,
    })

    // Update verification docs if provided
    if (verificationDocs) {
      // Delete existing and recreate
      await prisma.roleVerificationDoc.deleteMany({ where: { roleId: id } })
      await prisma.roleVerificationDoc.createMany({
        data: verificationDocs.map((doc, i) => ({
          roleId: id,
          documentName: doc.documentName,
          description: doc.description,
          isRequired: doc.isRequired,
          displayOrder: i,
        })),
      })
    }

    const result = await prisma.providerRole.findUnique({
      where: { id },
      include: { verificationDocs: { orderBy: { displayOrder: 'asc' } } },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('PATCH /api/regional/roles/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/regional/roles/[id]
 * Deactivate a role (soft delete).
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

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { userType: true },
    })

    if (!user || user.userType !== 'REGIONAL_ADMIN') {
      return NextResponse.json({ success: false, message: 'Only regional admins can delete roles' }, { status: 403 })
    }

    const existing = await prisma.providerRole.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 })
    }

    // Don't allow deleting system default roles
    if (!existing.createdByAdminId) {
      return NextResponse.json({ success: false, message: 'Cannot delete system default roles' }, { status: 403 })
    }

    await prisma.providerRole.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Role deactivated' })
  } catch (error) {
    console.error('DELETE /api/regional/roles/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
