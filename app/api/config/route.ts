import { NextRequest, NextResponse } from 'next/server'
import { rateLimitPublic } from '@/lib/rate-limit'
import { APP_NAME, APP_TAGLINE, APP_DOMAIN } from '@/lib/app-config'

export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const config = {
      appName: APP_NAME,
      appTagline: APP_TAGLINE,
      appDomain: APP_DOMAIN,
      heroTitle: process.env.HERO_TITLE || 'Your Health, Our Priority',
      platformDescription: process.env.PLATFORM_DESC || 'Your Leading Digital Health Platform',
    }

    return NextResponse.json(config)
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to load configuration' },
      { status: 500 }
    )
  }
}
