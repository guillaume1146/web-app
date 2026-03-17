import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
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

  // Verify the authenticated user is the resource owner
  if (auth.sub !== id) {
    return NextResponse.json({ success: false, message: 'Forbidden: You can only view your own booking requests' }, { status: 403 })
  }

  try {
    // Find the nanny profile
    const nannyProfile = await prisma.nannyProfile.findFirst({
      where: { userId: id },
      select: { id: true },
    })

    if (!nannyProfile) {
      return NextResponse.json({ success: false, message: 'Nanny profile not found' }, { status: 404 })
    }

    const bookings = await prisma.childcareBooking.findMany({
      where: { nannyId: nannyProfile.id, status: 'pending' },
      include: {
        patient: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true, profileImage: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: bookings })
  } catch (error) {
    console.error('GET /api/nannies/[id]/booking-requests error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
