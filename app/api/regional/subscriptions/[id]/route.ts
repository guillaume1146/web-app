import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'
import { updateSubscriptionPlanSchema } from '@/lib/validations/api'

/**
 * GET /api/regional/subscriptions/[id]
 * Returns a single subscription plan.
 */
export async function GET(
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

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    })

    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    console.error('GET /api/regional/subscriptions/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/regional/subscriptions/[id]
 * Update a subscription plan (only plans created by this admin or for their region).
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

    const adminProfile = await prisma.regionalAdminProfile.findFirst({
      where: { userId: auth.sub },
      select: { countryCode: true },
    })

    if (!adminProfile?.countryCode) {
      return NextResponse.json({ success: false, message: 'Regional admin profile not found' }, { status: 403 })
    }

    // Verify plan belongs to admin's region
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } })
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
    }
    if (plan.countryCode !== adminProfile.countryCode) {
      return NextResponse.json({ success: false, message: 'Cannot modify plans from other regions' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSubscriptionPlanSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0].message }, { status: 400 })
    }

    // Convert null JSON fields to Prisma.JsonNull
    const updateData = { ...parsed.data } as Record<string, unknown>
    if (updateData.discounts === null) updateData.discounts = Prisma.JsonNull
    if (updateData.paidServices === null) updateData.paidServices = Prisma.JsonNull

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/regional/subscriptions/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/regional/subscriptions/[id]
 * Soft-delete (deactivate) a subscription plan.
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

    const adminProfile = await prisma.regionalAdminProfile.findFirst({
      where: { userId: auth.sub },
      select: { countryCode: true },
    })

    if (!adminProfile?.countryCode) {
      return NextResponse.json({ success: false, message: 'Regional admin profile not found' }, { status: 403 })
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } })
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 })
    }
    if (plan.countryCode !== adminProfile.countryCode) {
      return NextResponse.json({ success: false, message: 'Cannot delete plans from other regions' }, { status: 403 })
    }

    // Soft delete — deactivate
    await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Plan deactivated' })
  } catch (error) {
    console.error('DELETE /api/regional/subscriptions/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
