import prisma from '@/lib/db'
import type { Prisma, WorkflowStepLog } from '@prisma/client'

export async function createStepLog(data: {
  instanceId: string
  fromStatus: string | null
  toStatus: string
  action: string
  actionByUserId: string
  actionByRole: string
  label: string
  message?: string
  contentType?: string
  contentData?: Prisma.InputJsonValue
  triggeredVideoCallId?: string
  triggeredStockActions?: Prisma.InputJsonValue
  notificationId?: string
}): Promise<WorkflowStepLog> {
  return prisma.workflowStepLog.create({ data })
}

export async function findTimelineByInstance(instanceId: string): Promise<WorkflowStepLog[]> {
  return prisma.workflowStepLog.findMany({
    where: { instanceId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findLatestStepLog(instanceId: string): Promise<WorkflowStepLog | null> {
  return prisma.workflowStepLog.findFirst({
    where: { instanceId },
    orderBy: { createdAt: 'desc' },
  })
}
