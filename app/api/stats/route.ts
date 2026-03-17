import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  try {
    const [doctorCount, patientCount, appointmentCount] = await Promise.all([
      prisma.user.count({ where: { userType: 'DOCTOR', accountStatus: 'active' } }),
      prisma.user.count({ where: { userType: 'PATIENT' } }),
      prisma.appointment.count(),
    ])

    // Get unique cities from doctor profiles
    const cities = await prisma.doctorProfile.findMany({
      where: { clinicAffiliation: { not: '' } },
      select: { clinicAffiliation: true },
      distinct: ['clinicAffiliation'],
    })

    return NextResponse.json({
      success: true,
      data: [
        { number: doctorCount, label: 'Qualified Doctors', color: 'text-blue-500' },
        { number: patientCount, label: 'Happy Patients', color: 'text-green-500' },
        { number: appointmentCount, label: 'Consultations', color: 'text-purple-500' },
        { number: cities.length, label: 'Cities Covered', color: 'text-orange-500' },
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
