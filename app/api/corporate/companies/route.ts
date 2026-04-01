import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic, rateLimitAuth } from '@/lib/rate-limit'
import { validateRequest } from '@/lib/auth/validate'

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

/**
 * POST /api/corporate/companies
 * Any authenticated user can create a company page.
 * Creates a CorporateAdminProfile linked to the current user.
 * The user keeps their original role (doctor, patient, nurse, etc.)
 */
export async function POST(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { companyName, registrationNumber, industry, employeeCount } = body

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Company name is required (min 2 characters)' }, { status: 400 })
    }

    // Check if user already has a company
    const existing = await prisma.corporateAdminProfile.findFirst({
      where: { userId: auth.sub },
    })
    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'You already have a company page. You can manage it from your dashboard.',
      }, { status: 409 })
    }

    // Create the CorporateAdminProfile for this user
    const company = await prisma.corporateAdminProfile.create({
      data: {
        userId: auth.sub,
        companyName: companyName.trim(),
        registrationNumber: registrationNumber?.trim() || null,
        industry: industry?.trim() || null,
        employeeCount: typeof employeeCount === 'number' ? employeeCount : 0,
      },
      select: {
        id: true,
        companyName: true,
        registrationNumber: true,
        industry: true,
        employeeCount: true,
      },
    })

    return NextResponse.json({ success: true, data: company }, { status: 201 })
  } catch (error) {
    console.error('POST /api/corporate/companies error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
