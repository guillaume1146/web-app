import prisma from '@/lib/db'
import type { Prisma, WorkflowInstance } from '@prisma/client'

export async function findInstanceById(id: string) {
  return prisma.workflowInstance.findUnique({
    where: { id },
    include: { template: true },
  })
}

export async function findInstanceByBooking(bookingId: string, bookingType: string) {
  return prisma.workflowInstance.findFirst({
    where: { bookingId, bookingType },
    include: { template: true },
  })
}

export async function findInstancesByUser(
  userId: string,
  role: 'patient' | 'provider',
  filters?: { currentStatus?: string; bookingType?: string }
) {
  return prisma.workflowInstance.findMany({
    where: {
      ...(role === 'patient' ? { patientUserId: userId } : { providerUserId: userId }),
      currentStatus: filters?.currentStatus,
      bookingType: filters?.bookingType,
    },
    include: { template: { select: { id: true, name: true, providerType: true, serviceMode: true } } },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function createInstance(data: {
  templateId: string
  bookingId: string
  bookingType: string
  currentStatus: string
  patientUserId: string
  providerUserId: string
  serviceMode: string
  metadata?: Prisma.InputJsonValue
}): Promise<WorkflowInstance> {
  return prisma.workflowInstance.create({ data })
}

export async function updateInstanceStatus(
  id: string,
  data: {
    currentStatus: string
    previousStatus: string | null
    completedAt?: Date
    cancelledAt?: Date
  }
): Promise<WorkflowInstance> {
  return prisma.workflowInstance.update({ where: { id }, data })
}
