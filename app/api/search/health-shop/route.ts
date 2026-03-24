import { NextRequest, NextResponse } from 'next/server'
import { rateLimitPublic } from '@/lib/rate-limit'
import * as repo from '@/lib/inventory/repository'
import { SHOP_CATEGORIES } from '@/lib/inventory/types'

export async function GET(request: NextRequest) {
  const limited = rateLimitPublic(request)
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || undefined
    const category = searchParams.get('category') || undefined
    const providerType = searchParams.get('providerType') || undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await repo.searchItems({
      query,
      category,
      providerType,
      limit: Math.min(limit, 50),
      offset,
    })

    return NextResponse.json({
      success: true,
      data: {
        items: result.items,
        total: result.total,
        categories: SHOP_CATEGORIES,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('GET /api/search/health-shop error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
