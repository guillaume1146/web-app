import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { createSubscriptionPlanSchema } from '@/lib/validations/api'

/**
 * GET /api/regional/subscriptions
 * Returns all subscription plans for the admin's region.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Get admin's countryCode from their profile
    const adminProfile = await prisma.regionalAdminProfile.findFirst({
      where: { userId: auth.sub },
      select: { countryCode: true },
    })

    if (!adminProfile?.countryCode) {
      return NextResponse.json({ success: false, message: 'Regional admin profile not found' }, { status: 403 })
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        OR: [
          { countryCode: adminProfile.countryCode },
          { countryCode: null },
        ],
      },
      include: {
        planServices: {
          include: {
            platformService: {
              select: { id: true, serviceName: true, category: true, defaultPrice: true, providerType: true },
            },
            serviceGroup: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    })

    return NextResponse.json({ success: true, data: plans })
  } catch (error) {
    console.error('GET /api/regional/subscriptions error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/regional/subscriptions
 * Create a new subscription plan for the admin's region.
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
    const parsed = createSubscriptionPlanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data

    // Generate slug from name + countryCode
    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${adminProfile.countryCode.toLowerCase()}`

    // Check for duplicate slug
    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: false, message: 'A plan with this name already exists for your region' }, { status: 409 })
    }

    const plan = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.subscriptionPlan.create({
        data: {
          name: data.name,
          slug,
          type: data.type,
          price: data.price,
          currency: data.currency,
          countryCode: adminProfile.countryCode!,
          targetAudience: data.targetAudience ?? null,
          gpConsultsPerMonth: data.gpConsultsPerMonth,
          specialistConsultsPerMonth: data.specialistConsultsPerMonth,
          nurseConsultsPerMonth: data.nurseConsultsPerMonth ?? 0,
          mentalHealthConsultsPerMonth: data.mentalHealthConsultsPerMonth ?? 0,
          nutritionConsultsPerMonth: data.nutritionConsultsPerMonth ?? 0,
          ambulanceFreePerMonth: data.ambulanceFreePerMonth ?? 0,
          discounts: data.discounts ?? Prisma.JsonNull,
          paidServices: data.paidServices ?? Prisma.JsonNull,
          features: data.features,
          createdByAdminId: auth.sub,
        },
      })

      // Link services/groups to the plan
      if (data.services && data.services.length > 0) {
        await tx.subscriptionPlanService.createMany({
          data: data.services.map(svc => ({
            planId: newPlan.id,
            platformServiceId: svc.platformServiceId ?? null,
            serviceGroupId: svc.serviceGroupId ?? null,
            isFree: svc.isFree ?? false,
            adminPrice: svc.adminPrice ?? null,
            monthlyLimit: svc.monthlyLimit ?? 0,
          })),
        })
      }

      return newPlan
    })

    return NextResponse.json({ success: true, data: plan }, { status: 201 })
  } catch (error) {
    console.error('POST /api/regional/subscriptions error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
