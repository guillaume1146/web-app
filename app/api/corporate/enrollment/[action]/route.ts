import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * POST /api/corporate/enrollment/accept or /api/corporate/enrollment/decline
 * Employee self-service: accept or decline a corporate enrollment invitation.
 * Body: { notificationId: string, companyId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { action } = await params
  if (!['accept', 'decline'].includes(action)) {
    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'companyId is required' }, { status: 400 })
    }

    // Find the company
    const company = await prisma.corporateAdminProfile.findUnique({
      where: { id: companyId },
      select: { id: true, userId: true, companyName: true },
    })
    if (!company) {
      return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 })
    }

    // Find the pending enrollment for this user
    const enrollment = await prisma.corporateEmployee.findFirst({
      where: {
        corporateAdminId: company.userId,
        userId: auth.sub,
        status: 'pending',
      },
    })
    if (!enrollment) {
      return NextResponse.json({ success: false, message: 'No pending enrollment found' }, { status: 404 })
    }

    if (action === 'accept') {
      await prisma.$transaction([
        prisma.corporateEmployee.update({
          where: { id: enrollment.id },
          data: { status: 'active', approvedAt: new Date() },
        }),
        prisma.notification.create({
          data: {
            userId: company.userId,
            title: 'Employee Accepted Invitation',
            message: `${auth.email} has accepted the invitation to join ${company.companyName}.`,
            type: 'corporate_enrollment',
            referenceId: company.id,
          },
        }),
      ])
    } else {
      await prisma.$transaction([
        prisma.corporateEmployee.update({
          where: { id: enrollment.id },
          data: { status: 'removed', removedAt: new Date() },
        }),
        prisma.notification.create({
          data: {
            userId: company.userId,
            title: 'Employee Declined Invitation',
            message: `${auth.email} has declined the invitation to join ${company.companyName}.`,
            type: 'corporate_enrollment',
            referenceId: company.id,
          },
        }),
      ])
    }

    return NextResponse.json({
      success: true,
      data: { action, companyName: company.companyName },
    })
  } catch (error) {
    console.error(`POST /api/corporate/enrollment/${action} error:`, error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
