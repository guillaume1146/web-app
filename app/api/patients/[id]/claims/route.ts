import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/patients/[id]/claims
 * Returns insurance claims submitted for the given patient.
 * Accessible by the patient themselves or any doctor/insurance rep.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  const auth = validateRequest(request)
  if (!auth) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (auth.userType === 'patient' && auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  try {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: id } })
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient profile not found' }, { status: 404 })
    }

    const claims = await prisma.insuranceClaim.findMany({
      where: { patientId: profile.id },
      select: {
        id: true,
        claimId: true,
        policyHolderName: true,
        description: true,
        policyType: true,
        claimAmount: true,
        status: true,
        submittedDate: true,
        resolvedDate: true,
        plan: { select: { planName: true, planType: true } },
        insuranceRep: {
          select: {
            companyName: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { submittedDate: 'desc' },
    })

    return NextResponse.json({ success: true, data: claims })
  } catch (error) {
    console.error('GET /api/patients/[id]/claims error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
