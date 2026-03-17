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
    const responderProfile = await prisma.emergencyWorkerProfile.findUnique({
      where: { userId: id },
      select: { id: true }
    })
    if (!responderProfile) return NextResponse.json({ success: false, message: 'Responder profile not found' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [completedToday, pendingRequests, wallet] = await Promise.all([
      prisma.emergencyBooking.count({
        where: { responderId: responderProfile.id, status: 'resolved', createdAt: { gte: today, lt: tomorrow } }
      }),
      prisma.emergencyBooking.findMany({
        where: { responderId: responderProfile.id, status: { in: ['pending', 'dispatched', 'en_route'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, emergencyType: true, location: true, priority: true, status: true, createdAt: true,
          patient: { select: { user: { select: { firstName: true, lastName: true, phone: true } } } }
        }
      }),
      prisma.userWallet.findUnique({ where: { userId: id }, select: { balance: true } })
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          completedServices: completedToday,
          walletBalance: wallet?.balance || 0,
        },
        incomingRequests: pendingRequests.map(r => ({
          id: r.id,
          urgency: r.priority === 'critical' || r.priority === 'high' ? 'critical' : 'urgent',
          incident: r.emergencyType,
          location: r.location,
          timestamp: r.createdAt,
          status: r.status,
          patientName: r.patient?.user ? `${r.patient.user.firstName} ${r.patient.user.lastName}` : 'Patient',
          patientPhone: r.patient?.user?.phone || '',
        })),
      }
    })
  } catch (error) {
    console.error('Responder dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
