import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  try {
    const [
      providerCount, patientCount, appointmentCount, regionCount,
      specialtyCount, productCount, roleCount, bookingCount,
      workflowCount, postCount, connectionCount, notificationCount,
    ] = await Promise.all([
      prisma.user.count({ where: { userType: { notIn: ['PATIENT', 'REGIONAL_ADMIN', 'CORPORATE_ADMIN', 'INSURANCE_REP', 'REFERRAL_PARTNER'] }, accountStatus: 'active' } }),
      prisma.user.count({ where: { userType: 'PATIENT' } }),
      prisma.appointment.count(),
      prisma.region.count(),
      prisma.providerSpecialty.count({ where: { isActive: true } }),
      prisma.providerInventoryItem.count({ where: { isActive: true, inStock: true } }),
      prisma.providerRole.count({ where: { isActive: true, isProvider: true } }),
      prisma.serviceBooking.count().catch(() => 0),
      prisma.workflowTemplate.count().catch(() => 0),
      prisma.post.count({ where: { isPublished: true } }),
      prisma.userConnection.count({ where: { status: 'accepted' } }).catch(() => 0),
      prisma.notification.count().catch(() => 0),
    ])

    const totalConsultations = appointmentCount + bookingCount

    return NextResponse.json({
      success: true,
      data: [
        { number: providerCount, label: 'Healthcare Providers', color: 'text-blue-500', icon: '🩺' },
        { number: patientCount, label: 'Registered Patients', color: 'text-green-500', icon: '👥' },
        { number: specialtyCount, label: 'Medical Specialties', color: 'text-purple-500', icon: '🏥' },
        { number: productCount, label: 'Health Products', color: 'text-orange-500', icon: '💊' },
        { number: totalConsultations, label: 'Consultations', color: 'text-teal-500', icon: '📋' },
        { number: regionCount, label: 'Regions Covered', color: 'text-cyan-500', icon: '🌍' },
        { number: roleCount, label: 'Provider Types', color: 'text-indigo-500', icon: '👨‍⚕️' },
        { number: workflowCount, label: 'Care Workflows', color: 'text-rose-500', icon: '⚙️' },
        { number: postCount, label: 'Community Posts', color: 'text-amber-500', icon: '📝' },
        { number: connectionCount, label: 'Connections Made', color: 'text-pink-500', icon: '🤝' },
      ],
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch statistics',
    }, { status: 500 })
  }
}
