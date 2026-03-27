import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import type { UserType } from '@prisma/client'
import { z } from 'zod'

const createCustomServiceSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(200),
  category: z.string().min(1, 'Category is required').max(100),
  description: z.string().min(1, 'Description is required').max(1000),
  defaultPrice: z.number().min(0, 'Price must be non-negative'),
  duration: z.number().int().min(1).optional(),
  priceOverride: z.number().min(0).optional(),
  providerType: z.string().optional(), // Required for REGIONAL_ADMIN creating services for a provider type
})

/**
 * POST /api/services/custom
 * Allows a provider to create a custom service.
 * Creates a PlatformService (isDefault=false, createdByProviderId set)
 * and a ProviderServiceConfig for the creator.
 * The service becomes available to other providers of the same type.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Get provider's user type
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: { id: true, userType: true, regionId: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const allowedTypes = [
      'DOCTOR', 'NURSE', 'NANNY', 'PHARMACIST', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
      'CAREGIVER', 'PHYSIOTHERAPIST', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
      'REGIONAL_ADMIN',
    ]
    if (!allowedTypes.includes(user.userType)) {
      return NextResponse.json({ success: false, message: 'Only service providers or regional admins can create services' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createCustomServiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data
    const isAdmin = user.userType === 'REGIONAL_ADMIN'

    // Regional admins must specify which provider type the service is for
    if (isAdmin && !data.providerType) {
      return NextResponse.json({ success: false, message: 'providerType is required for regional admins' }, { status: 400 })
    }
    const targetProviderType = (isAdmin ? data.providerType : user.userType) as UserType

    // Check if service with this name already exists for this provider type
    const existing = await prisma.platformService.findFirst({
      where: {
        providerType: targetProviderType,
        serviceName: data.serviceName,
        countryCode: null,
      },
    })

    if (existing) {
      if (isAdmin) {
        // Admin — service already exists globally, nothing to do
        return NextResponse.json({
          success: true,
          data: { platformServiceId: existing.id, isNew: false },
          message: 'Service already exists in the catalog',
        })
      }
      // Provider — add to their catalog
      await prisma.providerServiceConfig.upsert({
        where: {
          platformServiceId_providerUserId: {
            platformServiceId: existing.id,
            providerUserId: user.id,
          },
        },
        update: {
          priceOverride: data.priceOverride ?? null,
          isActive: true,
        },
        create: {
          platformServiceId: existing.id,
          providerUserId: user.id,
          priceOverride: data.priceOverride ?? null,
          isActive: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: { platformServiceId: existing.id, isNew: false },
        message: 'Service already exists — added to your catalog',
      })
    }

    // Get region's countryCode for the service
    let countryCode: string | null = null
    if (user.regionId) {
      const region = await prisma.region.findUnique({
        where: { id: user.regionId },
        select: { countryCode: true },
      })
      countryCode = region?.countryCode ?? null
    }

    // Create new platform service (+ provider config for providers only)
    const result = await prisma.$transaction(async (tx) => {
      const platformService = await tx.platformService.create({
        data: {
          providerType: targetProviderType!,
          serviceName: data.serviceName,
          category: data.category,
          description: data.description,
          defaultPrice: data.defaultPrice,
          duration: data.duration ?? null,
          isDefault: false,
          countryCode,
          createdByProviderId: isAdmin ? null : user.id,
        },
      })

      // Providers auto-add to their own catalog; admins don't
      if (!isAdmin) {
        await tx.providerServiceConfig.create({
          data: {
            platformServiceId: platformService.id,
            providerUserId: user.id,
            priceOverride: data.priceOverride ?? null,
            isActive: true,
          },
        })
      }

      return platformService
    })

    return NextResponse.json({
      success: true,
      data: { platformServiceId: result.id, isNew: true },
      message: 'Custom service created and added to platform catalog',
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/services/custom error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
