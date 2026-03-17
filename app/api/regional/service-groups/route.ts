import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { z } from 'zod'

const createServiceGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(200),
  description: z.string().max(500).optional(),
  serviceIds: z.array(z.string().min(1)).min(1, 'At least one service is required'),
})

/**
 * GET /api/regional/service-groups
 * Returns all service groups for the admin's region.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const adminProfile = await prisma.regionalAdminProfile.findFirst({
      where: { userId: auth.sub },
      select: { countryCode: true },
    })

    if (!adminProfile?.countryCode) {
      return NextResponse.json({ success: false, message: 'Regional admin profile not found' }, { status: 403 })
    }

    const groups = await prisma.serviceGroup.findMany({
      where: { countryCode: adminProfile.countryCode },
      include: {
        items: {
          include: {
            platformService: {
              select: {
                id: true,
                serviceName: true,
                category: true,
                defaultPrice: true,
                providerType: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: groups })
  } catch (error) {
    console.error('GET /api/regional/service-groups error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/regional/service-groups
 * Create a new service group.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const adminProfile = await prisma.regionalAdminProfile.findFirst({
      where: { userId: auth.sub },
      select: { countryCode: true },
    })

    if (!adminProfile?.countryCode) {
      return NextResponse.json({ success: false, message: 'Regional admin profile not found' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createServiceGroupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, description, serviceIds } = parsed.data

    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.serviceGroup.create({
        data: {
          name,
          description: description ?? null,
          countryCode: adminProfile.countryCode!,
          createdByAdminId: auth.sub,
        },
      })

      await tx.serviceGroupItem.createMany({
        data: serviceIds.map(serviceId => ({
          serviceGroupId: newGroup.id,
          platformServiceId: serviceId,
        })),
      })

      return newGroup
    })

    return NextResponse.json({ success: true, data: group }, { status: 201 })
  } catch (error) {
    console.error('POST /api/regional/service-groups error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
