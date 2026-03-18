import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

interface UnifiedBooking {
  id: string
  bookingType: string // appointment, nurse_booking, childcare, lab_test, emergency, service
  providerName: string
  providerRole: string
  providerSpecialty?: string
  serviceName?: string
  scheduledAt: string
  status: string
  price: number | null
  availableActions: string[]
}

function getAvailableActions(status: string, isProvider: boolean): string[] {
  if (isProvider) {
    switch (status) {
      case 'pending': return ['accept', 'deny']
      case 'accepted':
      case 'upcoming': return ['complete', 'cancel']
      case 'in_progress': return ['complete']
      default: return []
    }
  }
  // Patient
  switch (status) {
    case 'pending':
    case 'accepted':
    case 'upcoming': return ['cancel']
    case 'completed': return ['review']
    default: return []
  }
}

/**
 * GET /api/bookings/unified
 * Returns all bookings across all types for the current user.
 * Combines: Appointment, NurseBooking, ChildcareBooking, LabTestBooking, EmergencyBooking, ServiceBooking.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimitAuth(request)
  if (limited) return limited

  try {
    const auth = await validateRequest(request)
    if (!auth) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || 'patient' // patient or provider
    const isProvider = role === 'provider'

    // Get patient profile ID for patient bookings
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: auth.sub },
      select: { id: true },
    })

    const results: UnifiedBooking[] = []

    if (!isProvider && patient) {
      // Patient: fetch all booking types
      const [appointments, nurseBookings, childcareBookings, labBookings, emergencyBookings, serviceBookings] = await Promise.all([
        prisma.appointment.findMany({
          where: { patientId: patient.id },
          select: { id: true, scheduledAt: true, status: true, specialty: true, serviceName: true, servicePrice: true, doctor: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        }),
        prisma.nurseBooking.findMany({
          where: { patientId: patient.id },
          select: { id: true, scheduledAt: true, status: true, serviceName: true, servicePrice: true, nurse: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        }),
        prisma.childcareBooking.findMany({
          where: { patientId: patient.id },
          select: { id: true, scheduledAt: true, status: true, serviceName: true, servicePrice: true, nanny: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        }),
        prisma.labTestBooking.findMany({
          where: { patientId: patient.id },
          select: { id: true, scheduledAt: true, status: true, testName: true, price: true },
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        }),
        prisma.emergencyBooking.findMany({
          where: { patientId: patient.id },
          select: { id: true, emergencyType: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.serviceBooking.findMany({
          where: { patientId: auth.sub },
          select: { id: true, providerType: true, providerName: true, scheduledAt: true, status: true, serviceName: true, servicePrice: true, specialty: true },
          orderBy: { scheduledAt: 'desc' },
          take: 20,
        }),
      ])

      for (const a of appointments) {
        results.push({
          id: a.id, bookingType: 'appointment', providerName: `Dr. ${a.doctor.user.firstName} ${a.doctor.user.lastName}`,
          providerRole: 'DOCTOR', providerSpecialty: a.specialty || undefined, serviceName: a.serviceName || 'Consultation',
          scheduledAt: a.scheduledAt.toISOString(), status: a.status, price: a.servicePrice,
          availableActions: getAvailableActions(a.status, false),
        })
      }
      for (const n of nurseBookings) {
        results.push({
          id: n.id, bookingType: 'nurse_booking', providerName: `${n.nurse.user.firstName} ${n.nurse.user.lastName}`,
          providerRole: 'NURSE', serviceName: n.serviceName || 'Nurse Visit',
          scheduledAt: n.scheduledAt.toISOString(), status: n.status, price: n.servicePrice,
          availableActions: getAvailableActions(n.status, false),
        })
      }
      for (const c of childcareBookings) {
        results.push({
          id: c.id, bookingType: 'childcare', providerName: `${c.nanny.user.firstName} ${c.nanny.user.lastName}`,
          providerRole: 'NANNY', serviceName: c.serviceName || 'Childcare',
          scheduledAt: c.scheduledAt.toISOString(), status: c.status, price: c.servicePrice,
          availableActions: getAvailableActions(c.status, false),
        })
      }
      for (const l of labBookings) {
        results.push({
          id: l.id, bookingType: 'lab_test', providerName: 'Lab',
          providerRole: 'LAB_TECHNICIAN', serviceName: l.testName,
          scheduledAt: l.scheduledAt.toISOString(), status: l.status, price: l.price,
          availableActions: getAvailableActions(l.status, false),
        })
      }
      for (const e of emergencyBookings) {
        results.push({
          id: e.id, bookingType: 'emergency', providerName: 'Emergency',
          providerRole: 'EMERGENCY_WORKER', serviceName: e.emergencyType,
          scheduledAt: e.createdAt.toISOString(), status: e.status, price: null,
          availableActions: getAvailableActions(e.status, false),
        })
      }
      for (const s of serviceBookings) {
        results.push({
          id: s.id, bookingType: 'service', providerName: s.providerName || 'Provider',
          providerRole: s.providerType, providerSpecialty: s.specialty || undefined,
          serviceName: s.serviceName || s.providerType,
          scheduledAt: s.scheduledAt.toISOString(), status: s.status, price: s.servicePrice,
          availableActions: getAvailableActions(s.status, false),
        })
      }
    } else if (isProvider) {
      // Provider: fetch bookings where they are the provider
      const serviceBookings = await prisma.serviceBooking.findMany({
        where: { providerUserId: auth.sub },
        orderBy: { scheduledAt: 'desc' },
        take: 50,
      })

      for (const s of serviceBookings) {
        results.push({
          id: s.id, bookingType: 'service', providerName: s.providerName || 'Me',
          providerRole: s.providerType, providerSpecialty: s.specialty || undefined,
          serviceName: s.serviceName || s.providerType,
          scheduledAt: s.scheduledAt.toISOString(), status: s.status, price: s.servicePrice,
          availableActions: getAvailableActions(s.status, true),
        })
      }
    }

    // Sort all by scheduledAt desc
    results.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('GET /api/bookings/unified error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
