import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

// POST: Record a referral click (when someone visits with UTM params)
export async function POST(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const body = await request.json()
    const { referralCode, utmSource, utmMedium, utmCampaign, location, landingPage } = body

    if (!referralCode) {
      return NextResponse.json({ success: false, message: 'Referral code is required' }, { status: 400 })
    }

    // Verify referral code exists
    const partner = await prisma.referralPartnerProfile.findUnique({
      where: { referralCode },
      select: { id: true },
    })

    if (!partner) {
      return NextResponse.json({ success: false, message: 'Invalid referral code' }, { status: 404 })
    }

    const click = await prisma.referralClick.create({
      data: {
        referralCode,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        location: location || null,
        landingPage: landingPage || null,
      },
    })

    return NextResponse.json({ success: true, data: { trackingId: click.id } })
  } catch (error) {
    console.error('POST /api/referral-tracking error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
