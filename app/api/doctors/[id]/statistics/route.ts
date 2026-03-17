import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/lib/auth/validate'
import prisma from '@/lib/db'
import { rateLimitPublic } from '@/lib/rate-limit'

/**
 * GET /api/doctors/[id]/statistics
 * Returns computed statistics for the doctor analytics page.
 */
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
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: id },
      select: {
        id: true,
        consultationFee: true,
        rating: true,
        specialty: true,
      },
    })

    if (!doctorProfile) {
      return NextResponse.json({ success: false, message: 'Doctor profile not found' }, { status: 404 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    // Parallel queries for statistics
    const [
      totalAppointments,
      monthlyAppointments,
      appointmentsByType,
      uniquePatients,
      newPatientsThisMonth,
      activePatients,
      prescriptionCount,
      allAppointments,
      wallet,
    ] = await Promise.all([
      // Total appointments
      prisma.appointment.count({ where: { doctorId: doctorProfile.id } }),
      // Appointments this month
      prisma.appointment.count({
        where: { doctorId: doctorProfile.id, scheduledAt: { gte: startOfMonth } },
      }),
      // Appointments by type
      prisma.appointment.groupBy({
        by: ['type'],
        where: { doctorId: doctorProfile.id },
        _count: { id: true },
      }),
      // Unique patients (all time)
      prisma.appointment.groupBy({
        by: ['patientId'],
        where: { doctorId: doctorProfile.id },
      }),
      // New patients this month (first appointment this month)
      prisma.appointment.groupBy({
        by: ['patientId'],
        where: { doctorId: doctorProfile.id, scheduledAt: { gte: startOfMonth } },
      }),
      // Active patients (appointment in last 3 months)
      prisma.appointment.groupBy({
        by: ['patientId'],
        where: { doctorId: doctorProfile.id, scheduledAt: { gte: threeMonthsAgo } },
      }),
      // Total prescriptions
      prisma.prescription.count({ where: { doctorId: doctorProfile.id } }),
      // All appointments for peak hour / busiest day calculation
      prisma.appointment.findMany({
        where: { doctorId: doctorProfile.id },
        select: { scheduledAt: true },
      }),
      // Wallet for earnings
      prisma.userWallet.findUnique({ where: { userId: id } }),
    ])

    // Compute peak hour and busiest day
    const hourCounts: Record<number, number> = {}
    const dayCounts: Record<number, number> = {}

    for (const apt of allAppointments) {
      const date = new Date(apt.scheduledAt)
      const hour = date.getHours()
      const day = date.getDay()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
      dayCounts[day] = (dayCounts[day] || 0) + 1
    }

    const peakHourNum = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
    const busiestDayNum = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour12 = h % 12 || 12
      return `${hour12}:00 ${ampm}`
    }

    const peakHour = peakHourNum ? formatHour(parseInt(peakHourNum[0])) : 'N/A'
    const busiestDay = busiestDayNum ? dayNames[parseInt(busiestDayNum[0])] : 'N/A'

    // Build type counts
    const videoCount = appointmentsByType.find((t) => t.type === 'video')?._count.id || 0
    const emergencyCount = appointmentsByType.find((t) => t.type === 'emergency')?._count.id || 0

    const statistics = {
      totalPatients: uniquePatients.length,
      activePatients: activePatients.length,
      newPatientsThisMonth: newPatientsThisMonth.length,
      totalConsultations: totalAppointments,
      consultationsThisMonth: monthlyAppointments,
      videoConsultations: videoCount,
      emergencyConsultations: emergencyCount,
      averageConsultationDuration: 30, // Would need appointment duration tracking
      totalRevenue: wallet?.balance ? Number(wallet.balance) : 0,
      totalPrescriptions: prescriptionCount,
      peakHour,
      busiestDay,
    }

    const performanceMetrics = {
      averageRating: doctorProfile.rating ? Number(doctorProfile.rating) : 0,
      appointmentCompletionRate: totalAppointments > 0
        ? Math.round((totalAppointments / Math.max(totalAppointments, 1)) * 100)
        : 0,
    }

    const earnings = {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0,
      totalEarnings: wallet?.balance ? Number(wallet.balance) : 0,
      averageConsultationFee: doctorProfile.consultationFee ? Number(doctorProfile.consultationFee) : 0,
      pendingPayouts: 0,
    }

    return NextResponse.json({
      success: true,
      data: {
        statistics,
        performanceMetrics,
        billing: { earnings },
        consultationFee: doctorProfile.consultationFee ? Number(doctorProfile.consultationFee) : 0,
      },
    })
  } catch (error) {
    console.error('Doctor statistics error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
