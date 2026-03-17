import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * PATCH /api/regional/service-groups/[id]
 * Update a service group (name, description, items).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, serviceIds } = body as {
      name?: string
      description?: string
      serviceIds?: string[]
    }

    const group = await prisma.serviceGroup.findUnique({ where: { id } })
    if (!group || group.createdByAdminId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Service group not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      if (name || description !== undefined) {
        await tx.serviceGroup.update({
          where: { id },
          data: {
            ...(name ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
          },
        })
      }

      if (serviceIds) {
        await tx.serviceGroupItem.deleteMany({ where: { serviceGroupId: id } })
        await tx.serviceGroupItem.createMany({
          data: serviceIds.map(serviceId => ({
            serviceGroupId: id,
            platformServiceId: serviceId,
          })),
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Service group updated' })
  } catch (error) {
    console.error('PATCH /api/regional/service-groups/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/regional/service-groups/[id]
 * Delete a service group.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const group = await prisma.serviceGroup.findUnique({ where: { id } })
    if (!group || group.createdByAdminId !== auth.sub) {
      return NextResponse.json({ success: false, message: 'Service group not found' }, { status: 404 })
    }

    await prisma.serviceGroup.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Service group deleted' })
  } catch (error) {
    console.error('DELETE /api/regional/service-groups/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
