import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * GET /api/corporate/[id]/members
 * Returns corporate employees (CorporateEmployee join table) for this corporate admin.
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
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const members = await prisma.corporateEmployee.findMany({
      where: { corporateAdminId: id },
      select: {
        id: true,
        status: true,
        department: true,
        joinedAt: true,
        approvedAt: true,
        removedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
            accountStatus: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: members })
  } catch (error) {
    console.error('GET /api/corporate/[id]/members error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/corporate/[id]/members
 * Approve or reject a corporate employee enrollment.
 * Body: { memberId: string, action: 'approve' | 'reject' }
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
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { memberId, action } = body as { memberId?: string; action?: string }

    if (!memberId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'memberId and action (approve/reject) are required' },
        { status: 400 }
      )
    }

    // Verify the member belongs to this corporate admin
    const member = await prisma.corporateEmployee.findFirst({
      where: { id: memberId, corporateAdminId: id, status: 'pending' },
      select: { id: true, userId: true, user: { select: { firstName: true, lastName: true } } },
    })

    if (!member) {
      return NextResponse.json(
        { success: false, message: 'Pending member not found' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      await prisma.$transaction([
        prisma.corporateEmployee.update({
          where: { id: memberId },
          data: { status: 'active', approvedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: member.userId },
          data: { accountStatus: 'active' },
        }),
        prisma.notification.create({
          data: {
            userId: member.userId,
            title: 'Corporate Enrollment Approved',
            message: 'Your corporate wellness program enrollment has been approved. You can now log in.',
            type: 'corporate_enrollment',
          },
        }),
      ])
    } else {
      await prisma.$transaction([
        prisma.corporateEmployee.update({
          where: { id: memberId },
          data: { status: 'removed', removedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: member.userId },
          data: { accountStatus: 'active' }, // Still activate — they just won't have corporate benefits
        }),
        prisma.notification.create({
          data: {
            userId: member.userId,
            title: 'Corporate Enrollment Declined',
            message: 'Your corporate enrollment request was declined. You can still use MediWyz as an individual.',
            type: 'corporate_enrollment',
          },
        }),
      ])
    }

    return NextResponse.json({
      success: true,
      data: { action, memberId },
    })
  } catch (error) {
    console.error('PATCH /api/corporate/[id]/members error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
