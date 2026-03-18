import { PrismaClient } from '@prisma/client'

export async function seedServiceBookings(prisma: PrismaClient) {
  console.log('  Seeding service bookings for new roles...')

  // Get patients and new providers
  const patients = await prisma.user.findMany({
    where: { userType: 'PATIENT' },
    select: { id: true, firstName: true, lastName: true },
    take: 3,
  })

  const providers = await prisma.user.findMany({
    where: { userType: { in: ['CAREGIVER', 'PHYSIOTHERAPIST', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST'] } },
    select: { id: true, firstName: true, lastName: true, userType: true },
  })

  if (patients.length === 0 || providers.length === 0) {
    console.log('  Skipping — no patients or new providers found')
    return
  }

  const now = new Date()
  const bookings = []

  for (const provider of providers) {
    const patient = patients[Math.floor(Math.random() * patients.length)]
    const serviceNames: Record<string, string[]> = {
      CAREGIVER: ['Elder Daily Care — Half Day', 'Dementia Companion', 'Post-Surgery Home Aide'],
      PHYSIOTHERAPIST: ['Initial Assessment', 'Rehabilitation Session', 'Sports Injury Treatment'],
      DENTIST: ['Dental Check-up', 'Teeth Cleaning', 'Filling'],
      OPTOMETRIST: ['Eye Exam', 'Glasses Prescription', 'Contact Lens Fitting'],
      NUTRITIONIST: ['Initial Nutrition Assessment', 'Follow-up Consultation', 'Meal Plan Creation'],
    }

    const services = serviceNames[provider.userType] || ['Consultation']

    // Create 2-3 bookings per provider with different statuses
    const statuses = ['completed', 'accepted', 'pending']
    for (let i = 0; i < Math.min(services.length, 3); i++) {
      const daysOffset = i === 0 ? -7 : i === 1 ? 3 : 10
      const scheduledAt = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000)
      scheduledAt.setHours(9 + i * 2, 0, 0, 0)

      bookings.push({
        patientId: patient.id,
        providerUserId: provider.id,
        providerType: provider.userType,
        providerName: `${provider.firstName} ${provider.lastName}`,
        scheduledAt,
        duration: 30 + i * 15,
        type: i === 2 ? 'video' : 'in_person',
        status: statuses[i],
        serviceName: services[i],
        servicePrice: 500 + i * 300,
        specialty: null,
      })
    }
  }

  for (const b of bookings) {
    await prisma.serviceBooking.create({ data: b })
  }

  console.log(`  ✓ ${bookings.length} service bookings seeded for new provider roles`)
}
