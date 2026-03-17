import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { parsePagination } from '@/lib/api-utils'
import { rateLimitPublic } from '@/lib/rate-limit'

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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const { limit, offset } = parsePagination(searchParams)

  try {
    const profile = await prisma.patientProfile.findUnique({ where: { userId: id } })
    if (!profile) {
      return NextResponse.json({ success: false, message: 'Patient profile not found' }, { status: 404 })
    }

    const where = { patientId: profile.id, ...(status ? { status } : {}) }

    const [tests, total] = await Promise.all([
      prisma.labTest.findMany({
        where,
        include: { results: true },
        orderBy: { orderedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.labTest.count({ where }),
    ])

    return NextResponse.json({ success: true, data: tests, total, limit, offset })
  } catch (error) {
    console.error('Lab tests fetch error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
