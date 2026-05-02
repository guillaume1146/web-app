import { PrismaClient } from '@prisma/client'

/**
 * Seed 43: Create rich booking history for all patients.
 * Each patient gets multiple completed bookings with different provider types,
 * complete with workflow instances that go through the full lifecycle.
 * This populates the "My Health" page with real history data.
 */
export async function seedPatientBookingHistory(prisma: PrismaClient) {
  console.log('  43. Seeding patient booking history...')

  const patients = await prisma.patientProfile.findMany({
    select: { id: true, userId: true },
    take: 8,
  })

  if (patients.length === 0) {
    console.log('    No patients found, skipping')
    return
  }

  // Get providers by type
  const doctors = await prisma.doctorProfile.findMany({
    select: { id: true, userId: true, specialty: true, user: { select: { firstName: true, lastName: true } } },
    take: 5,
  })
  const nurses = await prisma.nurseProfile.findMany({
    select: { id: true, userId: true },
    take: 3,
  })
  const nannies = await prisma.nannyProfile.findMany({
    select: { id: true, userId: true },
    take: 3,
  })
  const labTechs = await prisma.labTechProfile.findMany({
    select: { id: true, userId: true },
    take: 2,
  })

  // Get workflow templates
  const templates: Record<string, any> = {}
  for (const key of ['doctor', 'nurse', 'nanny', 'lab-test']) {
    const providerTypeMap: Record<string, string> = { doctor: 'DOCTOR', nurse: 'NURSE', nanny: 'NANNY', 'lab-test': 'LAB_TECHNICIAN' }
    const t = await prisma.workflowTemplate.findFirst({
      where: { providerType: providerTypeMap[key], isDefault: true, isActive: true },
    })
    if (t) templates[key] = t
  }

  const now = new Date()
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000)

  let created = 0

  for (const patient of patients) {
    // Each patient gets 3-6 bookings spread over the last 90 days
    const bookingsToCreate = [
      // Completed doctor appointment (30 days ago)
      doctors.length > 0 ? {
        type: 'appointment',
        model: 'appointment',
        bookingRoute: 'doctor',
        providerType: 'DOCTOR',
        providerUserId: doctors[0].userId,
        data: {
          patientId: patient.id,
          doctorId: doctors[0].id,
          scheduledAt: daysAgo(30),
          type: 'video',
          status: 'completed',
          specialty: doctors[0].specialty?.[0] || 'General Practice',
          reason: 'Annual checkup',
          duration: 30,
          serviceName: 'General Consultation',
          servicePrice: 1500,
        },
      } : null,

      // Completed doctor appointment (60 days ago, different doctor)
      doctors.length > 1 ? {
        type: 'appointment',
        model: 'appointment',
        bookingRoute: 'doctor',
        providerType: 'DOCTOR',
        providerUserId: doctors[1].userId,
        data: {
          patientId: patient.id,
          doctorId: doctors[1].id,
          scheduledAt: daysAgo(60),
          type: 'in-person',
          status: 'completed',
          specialty: doctors[1].specialty?.[0] || 'General Practice',
          reason: 'Follow-up on blood test results',
          duration: 20,
          serviceName: 'Follow-up Consultation',
          servicePrice: 800,
        },
      } : null,

      // Upcoming doctor appointment (5 days from now)
      doctors.length > 0 ? {
        type: 'appointment',
        model: 'appointment',
        bookingRoute: 'doctor',
        providerType: 'DOCTOR',
        providerUserId: doctors[0].userId,
        data: {
          patientId: patient.id,
          doctorId: doctors[0].id,
          scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          type: 'video',
          status: 'confirmed',
          specialty: doctors[0].specialty?.[0] || 'General Practice',
          reason: 'Prescription renewal',
          duration: 15,
          serviceName: 'Teleconsultation',
          servicePrice: 1200,
        },
      } : null,

      // Completed nurse booking (20 days ago)
      nurses.length > 0 ? {
        type: 'nurseBooking',
        model: 'nurseBooking',
        bookingRoute: 'nurse',
        providerType: 'NURSE',
        providerUserId: nurses[0].userId,
        data: {
          patientId: patient.id,
          nurseId: nurses[0].id,
          scheduledAt: daysAgo(20),
          duration: 45,
          type: 'home_visit',
          status: 'completed',
          reason: 'Blood pressure monitoring',
          serviceName: 'Home Visit - Vitals Check',
          servicePrice: 500,
        },
      } : null,

      // Completed nanny booking (15 days ago)
      nannies.length > 0 ? {
        type: 'childcareBooking',
        model: 'childcareBooking',
        bookingRoute: 'nanny',
        providerType: 'NANNY',
        providerUserId: nannies[0].userId,
        data: {
          patientId: patient.id,
          nannyId: nannies[0].id,
          scheduledAt: daysAgo(15),
          duration: 240,
          type: 'home_visit',
          status: 'completed',
          children: ['Child 1'],
          reason: 'Regular childcare',
          serviceName: 'Full Day Childcare',
          servicePrice: 400,
        },
      } : null,

      // Completed lab test (45 days ago)
      labTechs.length > 0 ? {
        type: 'labTestBooking',
        model: 'labTestBooking',
        bookingRoute: 'lab-test',
        providerType: 'LAB_TECHNICIAN',
        providerUserId: labTechs[0].userId,
        data: {
          patientId: patient.id,
          labTechId: labTechs[0].id,
          testName: 'Complete Blood Count (CBC)',
          scheduledAt: daysAgo(45),
          status: 'completed',
          sampleType: 'blood',
          notes: 'Fasting blood sample',
          price: 500,
          resultFindings: 'All values within normal range',
          resultNotes: 'Hemoglobin: 14.2 g/dL, WBC: 7500/uL, Platelets: 250000/uL',
          resultDate: daysAgo(43),
        },
      } : null,
    ].filter(Boolean) as any[]

    for (const booking of bookingsToCreate) {
      try {
        const record = await (prisma as any)[booking.model].create({ data: booking.data })

        // Create workflow instance for completed bookings
        const template = templates[booking.bookingRoute]
        if (template) {
          const isCompleted = booking.data.status === 'completed'
          const isConfirmed = booking.data.status === 'confirmed'

          const instance = await prisma.workflowInstance.create({
            data: {
              templateId: template.id,
              bookingId: record.id,
              bookingType: booking.bookingRoute === 'doctor' ? 'appointment' :
                           booking.bookingRoute === 'nurse' ? 'nurse_booking' :
                           booking.bookingRoute === 'nanny' ? 'childcare_booking' :
                           'lab_test_booking',
              patientUserId: patient.userId,
              providerUserId: booking.providerUserId,
              currentStatus: booking.data.status,
              serviceMode: booking.data.type === 'video' ? 'video' : 'office',
              completedAt: isCompleted ? booking.data.scheduledAt : null,
              startedAt: booking.data.scheduledAt,
            },
          })

          // Create step logs for the history timeline
          await prisma.workflowStepLog.create({
            data: {
              instanceId: instance.id,
              fromStatus: null,
              toStatus: 'pending',
              action: 'create',
              actionByUserId: patient.userId,
              actionByRole: 'patient',
              label: 'Request sent',
            },
          })

          if (isConfirmed || isCompleted) {
            await prisma.workflowStepLog.create({
              data: {
                instanceId: instance.id,
                fromStatus: 'pending',
                toStatus: 'confirmed',
                action: 'accept',
                actionByUserId: booking.providerUserId,
                actionByRole: 'provider',
                label: 'Booking confirmed',
              },
            })
          }

          if (isCompleted) {
            await prisma.workflowStepLog.create({
              data: {
                instanceId: instance.id,
                fromStatus: 'confirmed',
                toStatus: 'completed',
                action: 'complete',
                actionByUserId: booking.providerUserId,
                actionByRole: 'provider',
                label: 'Consultation completed',
              },
            })

            // Create a notification for patient about completed booking
            await prisma.notification.create({
              data: {
                userId: patient.userId,
                type: 'workflow',
                title: `${booking.providerType.charAt(0) + booking.providerType.slice(1).toLowerCase()} consultation completed`,
                message: `Your ${booking.data.serviceName || 'consultation'} has been completed. Please leave a review.`,
                referenceId: record.id,
                referenceType: booking.bookingRoute,
              },
            })
          }
        }

        created++
      } catch (e: any) {
        // Skip duplicate or FK errors silently
        if (!e.message?.includes('Unique constraint')) {
          console.warn(`    Warning creating booking: ${e.message?.slice(0, 80)}`)
        }
      }
    }
  }

  console.log(`    Created ${created} booking history records`)
}
