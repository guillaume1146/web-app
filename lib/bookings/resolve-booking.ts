import prisma from '@/lib/db'

export interface ResolvedBooking {
  patientUserId: string
  providerUserId: string
  amount: number
  description: string
  serviceType: string
}

/**
 * Resolves a booking by type and ID, validates provider ownership,
 * updates status, and returns payment details.
 */
export async function resolveAndConfirmBooking(
  bookingId: string,
  bookingType: string,
  providerUserId: string
): Promise<{ error?: { message: string; status: number }; data?: ResolvedBooking }> {
  if (bookingType === 'doctor') {
    const appointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
      include: {
        doctor: { select: { userId: true, consultationFee: true, videoConsultationFee: true } },
        patient: { select: { userId: true } },
      },
    })
    if (!appointment) return { error: { message: 'Booking not found', status: 404 } }
    if (appointment.doctor.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    const amount = appointment.servicePrice
      ?? (appointment.type === 'video' ? appointment.doctor.videoConsultationFee : appointment.doctor.consultationFee)
    const description = appointment.serviceName
      ? `Doctor: ${appointment.serviceName} (${appointment.type})`
      : `Doctor consultation (${appointment.type})`
    await prisma.appointment.update({ where: { id: bookingId }, data: { status: 'upcoming' } })
    return { data: { patientUserId: appointment.patient.userId, providerUserId: appointment.doctor.userId, amount, description, serviceType: 'consultation' } }

  } else if (bookingType === 'nurse') {
    const booking = await prisma.nurseBooking.findUnique({
      where: { id: bookingId },
      include: { nurse: { select: { userId: true } }, patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (booking.nurse.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    const amount = booking.servicePrice ?? 500
    const description = booking.serviceName ? `Nurse: ${booking.serviceName} (${booking.type})` : `Nurse visit (${booking.type})`
    await prisma.nurseBooking.update({ where: { id: bookingId }, data: { status: 'upcoming' } })
    return { data: { patientUserId: booking.patient.userId, providerUserId: booking.nurse.userId, amount, description, serviceType: 'nurse' } }

  } else if (bookingType === 'nanny') {
    const booking = await prisma.childcareBooking.findUnique({
      where: { id: bookingId },
      include: { nanny: { select: { userId: true } }, patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (booking.nanny.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    const amount = booking.servicePrice ?? 400
    const description = booking.serviceName ? `Childcare: ${booking.serviceName} (${booking.type})` : `Childcare session (${booking.type})`
    await prisma.childcareBooking.update({ where: { id: bookingId }, data: { status: 'upcoming' } })
    return { data: { patientUserId: booking.patient.userId, providerUserId: booking.nanny.userId, amount, description, serviceType: 'nanny' } }

  } else if (bookingType === 'lab_test') {
    const booking = await prisma.labTestBooking.findUnique({
      where: { id: bookingId },
      include: { labTech: { select: { userId: true } }, patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (!booking.labTech || booking.labTech.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    const amount = booking.price ?? 500
    const description = `Lab test: ${booking.testName}`
    await prisma.labTestBooking.update({ where: { id: bookingId }, data: { status: 'upcoming' } })
    return { data: { patientUserId: booking.patient.userId, providerUserId: booking.labTech.userId, amount, description, serviceType: 'lab_test' } }

  } else if (bookingType === 'service') {
    const booking = await prisma.serviceBooking.findUnique({ where: { id: bookingId } })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (booking.providerUserId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    const amount = booking.servicePrice ?? 500
    const description = booking.serviceName ? `${booking.providerType}: ${booking.serviceName}` : `${booking.providerType} service`
    await prisma.serviceBooking.update({ where: { id: bookingId }, data: { status: 'accepted' } })
    return { data: { patientUserId: booking.patientId, providerUserId: booking.providerUserId, amount, description, serviceType: booking.providerType.toLowerCase() } }
  }

  return { error: { message: 'Unknown booking type', status: 400 } }
}

/**
 * Resolves a booking and sets its status to cancelled.
 */
export async function resolveAndDenyBooking(
  bookingId: string,
  bookingType: string,
  providerUserId: string
): Promise<{ error?: { message: string; status: number }; patientUserId?: string; description?: string }> {
  if (bookingType === 'doctor') {
    const booking = await prisma.appointment.findUnique({
      where: { id: bookingId },
      include: { doctor: { select: { userId: true } }, patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (booking.doctor.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    await prisma.appointment.update({ where: { id: bookingId }, data: { status: 'cancelled' } })
    return { patientUserId: booking.patient.userId, description: 'Doctor consultation' }

  } else if (bookingType === 'nurse') {
    const booking = await prisma.nurseBooking.findUnique({
      where: { id: bookingId },
      include: { nurse: { select: { userId: true } }, patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (booking.nurse.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    await prisma.nurseBooking.update({ where: { id: bookingId }, data: { status: 'cancelled' } })
    return { patientUserId: booking.patient.userId, description: 'Nurse visit' }

  } else if (bookingType === 'nanny') {
    const booking = await prisma.childcareBooking.findUnique({
      where: { id: bookingId },
      include: { nanny: { select: { userId: true } }, patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (booking.nanny.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    await prisma.childcareBooking.update({ where: { id: bookingId }, data: { status: 'cancelled' } })
    return { patientUserId: booking.patient.userId, description: 'Childcare session' }

  } else if (bookingType === 'lab_test') {
    const booking = await prisma.labTestBooking.findUnique({
      where: { id: bookingId },
      include: { labTech: { select: { userId: true } }, patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (!booking.labTech || booking.labTech.userId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    await prisma.labTestBooking.update({ where: { id: bookingId }, data: { status: 'cancelled' } })
    return { patientUserId: booking.patient.userId, description: `Lab test: ${booking.testName}` }

  } else if (bookingType === 'emergency') {
    const booking = await prisma.emergencyBooking.findUnique({
      where: { id: bookingId },
      include: { patient: { select: { userId: true } } },
    })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    await prisma.emergencyBooking.update({ where: { id: bookingId }, data: { status: 'cancelled' } })
    return { patientUserId: booking.patient.userId, description: 'Emergency request' }

  } else if (bookingType === 'service') {
    const booking = await prisma.serviceBooking.findUnique({ where: { id: bookingId } })
    if (!booking) return { error: { message: 'Booking not found', status: 404 } }
    if (booking.providerUserId !== providerUserId) return { error: { message: 'Forbidden', status: 403 } }
    await prisma.serviceBooking.update({ where: { id: bookingId }, data: { status: 'cancelled' } })
    return { patientUserId: booking.patientId, description: booking.serviceName || `${booking.providerType} service` }
  }

  return { error: { message: 'Unknown booking type', status: 400 } }
}
