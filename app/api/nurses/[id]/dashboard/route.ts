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
    const nurseProfile = await prisma.nurseProfile.findUnique({
      where: { userId: id },
      select: { id: true, specializations: true, experience: true }
    })
    if (!nurseProfile) return NextResponse.json({ success: false, message: 'Nurse profile not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [todayBookings, completedTotal, monthBookings, recentBookings, wallet] = await Promise.all([
      prisma.nurseBooking.count({
        where: { nurseId: nurseProfile.id, scheduledAt: { gte: today, lt: tomorrow }, status: { in: ['upcoming', 'pending'] } }
      }),
      prisma.nurseBooking.count({
        where: { nurseId: nurseProfile.id, status: 'completed' }
      }),
      prisma.nurseBooking.findMany({
        where: { nurseId: nurseProfile.id, status: 'completed', scheduledAt: { gte: firstOfMonth } },
        select: { id: true }
      }),
      prisma.nurseBooking.findMany({
        where: { nurseId: nurseProfile.id },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
        select: {
          id: true, scheduledAt: true, duration: true, type: true, status: true, reason: true,
          patient: { select: { id: true, user: { select: { firstName: true, lastName: true, profileImage: true } } } }
        }
      }),
      prisma.userWallet.findUnique({ where: { userId: id }, select: { balance: true } })
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          todayAppointments: todayBookings,
          completedServices: completedTotal,
          monthlyCompletedServices: monthBookings.length,
          walletBalance: wallet?.balance || 0,
        },
        recentBookings: recentBookings.map(b => ({
          id: b.id,
          patientName: b.patient?.user ? `${b.patient.user.firstName} ${b.patient.user.lastName}` : 'Patient',
          patientAvatar: b.patient?.user?.profileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.patient?.user?.firstName || 'P'}`,
          scheduledAt: b.scheduledAt,
          duration: b.duration,
          serviceType: b.reason || b.type || 'Nursing Service',
          status: b.status,
        })),
      }
    })
  } catch (error) {
    console.error('Nurse dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
