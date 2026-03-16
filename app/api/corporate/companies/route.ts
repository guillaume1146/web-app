import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/corporate/companies
 * Public endpoint — returns list of companies for patient enrollment dropdown.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const companies = await prisma.corporateAdminProfile.findMany({
      where: {
        user: { accountStatus: 'active' },
      },
      select: {
        id: true,
        companyName: true,
      },
      orderBy: { companyName: 'asc' },
    })

    return NextResponse.json({ success: true, data: companies })
  } catch (error) {
    console.error('GET /api/corporate/companies error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
