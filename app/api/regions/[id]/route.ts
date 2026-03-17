import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/regions/[id]
 * Returns a single region by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const { id } = await params

    const region = await prisma.region.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        countryCode: true,
        language: true,
        flag: true,
        currency: true,
        currencySymbol: true,
        trialCredit: true,
        isActive: true,
      },
    })

    if (!region) {
      return NextResponse.json({ success: false, message: 'Region not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: region })
  } catch (error) {
    console.error('GET /api/regions/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
