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
    const labProfile = await prisma.labTechProfile.findUnique({
      where: { userId: id },
      select: { id: true, labName: true }
    })
    if (!labProfile) return NextResponse.json({ success: false, message: 'Lab tech profile not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [pendingResults, recentBookings, todayBookings, monthBookings, wallet] = await Promise.all([
      prisma.labTestBooking.count({
        where: { labTechId: labProfile.id, status: { in: ['pending', 'upcoming'] } }
      }),
      prisma.labTestBooking.findMany({
        where: { labTechId: labProfile.id },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        select: {
          id: true, testName: true, scheduledAt: true, status: true, price: true,
          patient: { select: { user: { select: { firstName: true, lastName: true } } } }
        }
      }),
      prisma.labTestBooking.findMany({
        where: { labTechId: labProfile.id, scheduledAt: { gte: today, lt: tomorrow }, status: 'completed' },
        select: { price: true }
      }),
      prisma.labTestBooking.findMany({
        where: { labTechId: labProfile.id, scheduledAt: { gte: firstOfMonth }, status: 'completed' },
        select: { price: true }
      }),
      prisma.userWallet.findUnique({ where: { userId: id }, select: { balance: true } })
    ])

    const dailyRevenue = todayBookings.reduce((sum, b) => sum + (b.price || 0), 0)
    const monthlyRevenue = monthBookings.reduce((sum, b) => sum + (b.price || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          dailyRevenue,
          pendingResults,
          monthlyRevenue,
          walletBalance: wallet?.balance || 0,
        },
        recentBookings: recentBookings.map((b, idx) => ({
          id: b.id,
          appointmentId: `#LAB-${b.id.slice(0, 4).toUpperCase()}`,
          patientName: b.patient?.user ? `${b.patient.user.firstName} ${b.patient.user.lastName}` : 'Patient',
          testName: b.testName,
          total: b.price || 0,
          status: b.status,
          scheduledAt: b.scheduledAt,
        })),
      }
    })
  } catch (error) {
    console.error('Lab tech dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
