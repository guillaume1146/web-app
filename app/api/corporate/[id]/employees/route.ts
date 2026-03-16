import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

/**
 * GET /api/corporate/[id]/employees
 * Returns active corporate employees for this corporate admin.
 * Uses the CorporateEmployee join table.
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
    const employees = await prisma.corporateEmployee.findMany({
      where: {
        corporateAdminId: id,
        status: 'active',
      },
      select: {
        id: true,
        department: true,
        joinedAt: true,
        approvedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
            accountStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 100,
    })

    // Map to flat structure for backward compatibility
    const data = employees.map(emp => ({
      id: emp.user.id,
      name: `${emp.user.firstName} ${emp.user.lastName}`,
      email: emp.user.email,
      department: emp.department || 'General',
      policyType: 'Standard',
      status: emp.user.accountStatus,
      joinDate: emp.joinedAt.toISOString().split('T')[0],
    }))

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    })
  } catch (error) {
    console.error('GET /api/corporate/[id]/employees error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
