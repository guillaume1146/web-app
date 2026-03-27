import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { validateRequest } from '@/lib/auth/validate'
import { rateLimitAuth } from '@/lib/rate-limit'

interface UnifiedBooking {
  id: string
  bookingType: string // appointment, nurse_booking, childcare_booking, lab_test_booking, emergency_booking, service_booking
  providerName: string
  providerRole: string
  providerSpecialty?: string
  serviceName?: string
  scheduledAt: string
  status: string
  price: number | null
  availableActions: string[]
  patientName?: string
  type?: string
  reason?: string
  duration?: number
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
      // Provider: fetch ALL booking types where they are the provider
      const user = await prisma.user.findUnique({
        where: { id: auth.sub },
        select: { userType: true },
      })

      // Fetch from all booking models based on provider type
      const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })
      const nurseProfile = await prisma.nurseProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })
      const nannyProfile = await prisma.nannyProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })
      const labProfile = await prisma.labTechProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })
      const emwProfile = await prisma.emergencyWorkerProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })
      const pharmacistProfile = await prisma.pharmacistProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })

      const [appointments, nurseBookings, childcareBookings, labBookings, emergencyBookings, serviceBookings] = await Promise.all([
        doctorProfile ? prisma.appointment.findMany({
          where: { doctorId: doctorProfile.id },
          select: { id: true, scheduledAt: true, status: true, type: true, specialty: true, reason: true, duration: true, serviceName: true, servicePrice: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { scheduledAt: 'desc' },
          take: 50,
        }) : Promise.resolve([]),
        nurseProfile ? prisma.nurseBooking.findMany({
          where: { nurseId: nurseProfile.id },
          select: { id: true, scheduledAt: true, status: true, type: true, serviceName: true, servicePrice: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { scheduledAt: 'desc' },
          take: 50,
        }) : Promise.resolve([]),
        nannyProfile ? prisma.childcareBooking.findMany({
          where: { nannyId: nannyProfile.id },
          select: { id: true, scheduledAt: true, status: true, type: true, serviceName: true, servicePrice: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { scheduledAt: 'desc' },
          take: 50,
        }) : Promise.resolve([]),
        labProfile ? prisma.labTestBooking.findMany({
          where: { labTechId: labProfile.id },
          select: { id: true, scheduledAt: true, status: true, testName: true, price: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { scheduledAt: 'desc' },
          take: 50,
        }) : Promise.resolve([]),
        emwProfile ? prisma.emergencyBooking.findMany({
          where: { responderId: emwProfile.id },
          select: { id: true, emergencyType: true, status: true, createdAt: true, patient: { select: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }) : Promise.resolve([]),
        prisma.serviceBooking.findMany({
          where: { providerUserId: auth.sub },
          select: { id: true, providerType: true, providerName: true, scheduledAt: true, status: true, type: true, serviceName: true, servicePrice: true, specialty: true, patientId: true },
          orderBy: { scheduledAt: 'desc' },
          take: 50,
        }),
      ])

      for (const a of appointments) {
        results.push({
          id: a.id, bookingType: 'appointment',
          providerName: 'Me', providerRole: 'DOCTOR',
          providerSpecialty: a.specialty || undefined,
          serviceName: a.serviceName || 'Consultation',
          scheduledAt: a.scheduledAt.toISOString(), status: a.status, price: a.servicePrice,
          availableActions: getAvailableActions(a.status, true),
          patientName: `${a.patient.user.firstName} ${a.patient.user.lastName}`,
          type: a.type, reason: a.reason || undefined, duration: a.duration,
        })
      }
      for (const n of nurseBookings) {
        results.push({
          id: n.id, bookingType: 'nurse_booking',
          providerName: 'Me', providerRole: 'NURSE',
          serviceName: n.serviceName || 'Nurse Visit',
          scheduledAt: n.scheduledAt.toISOString(), status: n.status, price: n.servicePrice,
          availableActions: getAvailableActions(n.status, true),
          patientName: `${n.patient.user.firstName} ${n.patient.user.lastName}`,
          type: n.type,
        })
      }
      for (const c of childcareBookings) {
        results.push({
          id: c.id, bookingType: 'childcare_booking',
          providerName: 'Me', providerRole: 'NANNY',
          serviceName: c.serviceName || 'Childcare',
          scheduledAt: c.scheduledAt.toISOString(), status: c.status, price: c.servicePrice,
          availableActions: getAvailableActions(c.status, true),
          patientName: `${c.patient.user.firstName} ${c.patient.user.lastName}`,
          type: c.type,
        })
      }
      for (const l of labBookings) {
        results.push({
          id: l.id, bookingType: 'lab_test_booking',
          providerName: 'Me', providerRole: 'LAB_TECHNICIAN',
          serviceName: l.testName,
          scheduledAt: l.scheduledAt.toISOString(), status: l.status, price: l.price,
          availableActions: getAvailableActions(l.status, true),
          patientName: `${l.patient.user.firstName} ${l.patient.user.lastName}`,
        })
      }
      for (const e of emergencyBookings) {
        results.push({
          id: e.id, bookingType: 'emergency_booking',
          providerName: 'Me', providerRole: 'EMERGENCY_WORKER',
          serviceName: e.emergencyType,
          scheduledAt: e.createdAt.toISOString(), status: e.status, price: null,
          availableActions: getAvailableActions(e.status, true),
          patientName: `${e.patient.user.firstName} ${e.patient.user.lastName}`,
        })
      }
      for (const s of serviceBookings) {
        // Get patient name for service bookings
        let patientName = 'Patient'
        if (s.patientId) {
          const pu = await prisma.user.findUnique({ where: { id: s.patientId }, select: { firstName: true, lastName: true } })
          if (pu) patientName = `${pu.firstName} ${pu.lastName}`
        }
        results.push({
          id: s.id, bookingType: 'service_booking',
          providerName: 'Me', providerRole: s.providerType,
          providerSpecialty: s.specialty || undefined,
          serviceName: s.serviceName || s.providerType,
          scheduledAt: s.scheduledAt.toISOString(), status: s.status, price: s.servicePrice,
          availableActions: getAvailableActions(s.status, true),
          patientName, type: s.type,
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
