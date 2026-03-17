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
  if (auth.sub !== id) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  try {
    const nannyProfile = await prisma.nannyProfile.findUnique({
      where: { userId: id },
      select: { id: true, experience: true, certifications: true }
    })
    if (!nannyProfile) return NextResponse.json({ success: false, message: 'Nanny profile not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [upcomingCount, familiesHelped, monthBookings, recentBookings, wallet] = await Promise.all([
      prisma.childcareBooking.count({
        where: { nannyId: nannyProfile.id, status: { in: ['upcoming', 'pending', 'confirmed'] }, scheduledAt: { gte: today } }
      }),
      prisma.childcareBooking.groupBy({
        by: ['patientId'],
        where: { nannyId: nannyProfile.id, status: 'completed' }
      }),
      prisma.childcareBooking.findMany({
        where: { nannyId: nannyProfile.id, status: 'completed', scheduledAt: { gte: firstOfMonth } },
        select: { id: true }
      }),
      prisma.childcareBooking.findMany({
        where: { nannyId: nannyProfile.id },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        select: {
          id: true, scheduledAt: true, duration: true, type: true, status: true, reason: true,
          specialInstructions: true,
          patient: { select: { id: true, user: { select: { firstName: true, lastName: true, profileImage: true } } } }
        }
      }),
      prisma.userWallet.findUnique({ where: { userId: id }, select: { balance: true } })
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          upcomingBookings: upcomingCount,
          familiesHelped: familiesHelped.length,
          monthlyCompletedBookings: monthBookings.length,
          walletBalance: wallet?.balance || 0,
        },
        recentBookings: recentBookings.map(b => ({
          id: b.id,
          familyName: b.patient?.user ? `The ${b.patient.user.lastName} Family` : 'Family',
          familyAvatar: b.patient?.user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.patient?.user?.lastName || 'F'}`,
          scheduledAt: b.scheduledAt,
          duration: b.duration,
          serviceType: b.reason || b.type || 'Childcare',
          status: b.status,
        })),
      }
    })
  } catch (error) {
    console.error('Nanny dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
