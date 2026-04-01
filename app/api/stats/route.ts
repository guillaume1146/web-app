import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
  try {
    const [providerCount, patientCount, appointmentCount, regionCount, specialtyCount, productCount] = await Promise.all([
      prisma.user.count({ where: { userType: { notIn: ['PATIENT', 'REGIONAL_ADMIN', 'CORPORATE_ADMIN', 'INSURANCE_REP', 'REFERRAL_PARTNER'] }, accountStatus: 'active' } }),
      prisma.user.count({ where: { userType: 'PATIENT' } }),
      prisma.appointment.count(),
      prisma.region.count(),
      prisma.providerSpecialty.count({ where: { isActive: true } }),
      prisma.providerInventoryItem.count({ where: { isActive: true, inStock: true } }),
    ])

    return NextResponse.json({
      success: true,
      data: [
        { number: providerCount, label: 'Healthcare Providers', color: 'text-blue-500' },
        { number: patientCount, label: 'Registered Patients', color: 'text-green-500' },
        { number: specialtyCount, label: 'Medical Specialties', color: 'text-purple-500' },
        { number: productCount, label: 'Health Products', color: 'text-orange-500' },
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
