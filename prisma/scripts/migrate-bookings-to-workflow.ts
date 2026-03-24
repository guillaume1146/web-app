/**
 * Migration Script — Attach workflow instances to existing bookings.
 *
 * This is a one-time script that creates WorkflowInstance + initial WorkflowStepLog
 * for all active bookings that don't already have a workflow.
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/migrate-bookings-to-workflow.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BOOKING_CONFIGS = [
  {
    model: 'appointment' as const,
    bookingType: 'appointment',
    providerType: 'DOCTOR',
    getProviderUserId: async (booking: { doctorId: string }) => {
      const doc = await prisma.doctorProfile.findUnique({ where: { id: booking.doctorId }, select: { userId: true } })
      return doc?.userId
    },
    getPatientUserId: async (booking: { patientId: string }) => {
      const pat = await prisma.patientProfile.findUnique({ where: { id: booking.patientId }, select: { userId: true } })
      return pat?.userId
    },
    getMode: (booking: { type: string }) => {
      if (booking.type === 'video') return 'video'
      if (booking.type === 'home_visit') return 'home'
      return 'office'
    },
  },
  {
    model: 'nurseBooking' as const,
    bookingType: 'nurse_booking',
    providerType: 'NURSE',
    getProviderUserId: async (booking: { nurseId: string }) => {
      const nurse = await prisma.nurseProfile.findUnique({ where: { id: booking.nurseId }, select: { userId: true } })
      return nurse?.userId
    },
    getPatientUserId: async (booking: { patientId: string }) => {
      const pat = await prisma.patientProfile.findUnique({ where: { id: booking.patientId }, select: { userId: true } })
      return pat?.userId
    },
    getMode: (booking: { type: string }) => {
      if (booking.type === 'video') return 'video'
      if (booking.type === 'home_visit') return 'home'
      return 'office'
    },
  },
  {
    model: 'childcareBooking' as const,
    bookingType: 'childcare_booking',
    providerType: 'NANNY',
    getProviderUserId: async (booking: { nannyId: string }) => {
      const nanny = await prisma.nannyProfile.findUnique({ where: { id: booking.nannyId }, select: { userId: true } })
      return nanny?.userId
    },
    getPatientUserId: async (booking: { patientId: string }) => {
      const pat = await prisma.patientProfile.findUnique({ where: { id: booking.patientId }, select: { userId: true } })
      return pat?.userId
    },
    getMode: (booking: { type: string }) => {
      if (booking.type === 'video') return 'video'
      if (booking.type === 'home_visit') return 'home'
      return 'office'
    },
  },
  {
    model: 'serviceBooking' as const,
    bookingType: 'service_booking',
    providerType: null, // dynamic
    getProviderUserId: async (booking: { providerUserId: string }) => booking.providerUserId,
    getPatientUserId: async (booking: { patientId: string }) => booking.patientId,
    getMode: (booking: { type: string }) => {
      if (booking.type === 'video') return 'video'
      if (booking.type === 'home_visit') return 'home'
      return 'office'
    },
  },
]

async function migrate() {
  console.log('Starting workflow migration...')

  let total = 0
  let attached = 0
  let skipped = 0

  for (const config of BOOKING_CONFIGS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any)[config.model]
    const bookings = await model.findMany({
      where: {
        status: { not: 'cancelled' },
      },
    })

    console.log(`  Processing ${bookings.length} ${config.bookingType} bookings...`)

    for (const booking of bookings) {
      total++

      // Check if workflow already exists
      const existing = await prisma.workflowInstance.findFirst({
        where: { bookingId: booking.id, bookingType: config.bookingType },
      })

      if (existing) {
        skipped++
        continue
      }

      const providerUserId = await config.getProviderUserId(booking)
      const patientUserId = await config.getPatientUserId(booking)

      if (!providerUserId || !patientUserId) {
        console.warn(`    Skipping ${booking.id}: missing provider or patient userId`)
        skipped++
        continue
      }

      const serviceMode = config.getMode(booking)
      const providerType = config.providerType || booking.providerType || 'DOCTOR'

      // Find matching template
      const template = await prisma.workflowTemplate.findFirst({
        where: {
          providerType,
          serviceMode,
          isDefault: true,
          isActive: true,
        },
      })

      if (!template) {
        console.warn(`    No template found for ${providerType}/${serviceMode}`)
        skipped++
        continue
      }

      // Create workflow instance at current booking status
      const instance = await prisma.workflowInstance.create({
        data: {
          templateId: template.id,
          bookingId: booking.id,
          bookingType: config.bookingType,
          currentStatus: booking.status,
          patientUserId,
          providerUserId,
          serviceMode,
          completedAt: booking.status === 'completed' ? new Date() : null,
          cancelledAt: booking.status === 'cancelled' ? new Date() : null,
        },
      })

      // Create initial step log
      await prisma.workflowStepLog.create({
        data: {
          instanceId: instance.id,
          fromStatus: null,
          toStatus: booking.status,
          action: 'migration',
          actionByUserId: 'system',
          actionByRole: 'system',
          label: `Migrated at status: ${booking.status}`,
          message: 'Workflow instance created by migration script',
        },
      })

      attached++
    }
  }

  console.log(`\nMigration complete:`)
  console.log(`  Total bookings: ${total}`)
  console.log(`  Workflows attached: ${attached}`)
  console.log(`  Skipped: ${skipped}`)
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
