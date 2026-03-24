import prisma from '@/lib/db'
import type { Prisma, WorkflowTemplate } from '@prisma/client'

export async function findTemplateById(id: string): Promise<WorkflowTemplate | null> {
  return prisma.workflowTemplate.findUnique({ where: { id } })
}

export async function findTemplateBySlug(slug: string): Promise<WorkflowTemplate | null> {
  return prisma.workflowTemplate.findUnique({ where: { slug } })
}

export async function findTemplates(filters: {
  providerType?: string
  serviceMode?: string
  isDefault?: boolean
  isActive?: boolean
  platformServiceId?: string
  createdByProviderId?: string
  createdByAdminId?: string
  regionCode?: string
}): Promise<WorkflowTemplate[]> {
  return prisma.workflowTemplate.findMany({
    where: {
      providerType: filters.providerType,
      serviceMode: filters.serviceMode,
      isDefault: filters.isDefault,
      isActive: filters.isActive ?? true,
      platformServiceId: filters.platformServiceId,
      createdByProviderId: filters.createdByProviderId,
      createdByAdminId: filters.createdByAdminId,
      regionCode: filters.regionCode,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createTemplate(data: {
  name: string
  slug: string
  description?: string
  providerType: string
  serviceMode: string
  isDefault?: boolean
  createdByProviderId?: string
  createdByAdminId?: string
  regionCode?: string
  platformServiceId?: string
  steps: Prisma.InputJsonValue
  transitions: Prisma.InputJsonValue
}): Promise<WorkflowTemplate> {
  return prisma.workflowTemplate.create({ data })
}

export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string
    description: string
    isActive: boolean
    steps: Prisma.InputJsonValue
    transitions: Prisma.InputJsonValue
    platformServiceId: string | null
  }>
): Promise<WorkflowTemplate> {
  return prisma.workflowTemplate.update({ where: { id }, data })
}

export async function deactivateTemplate(id: string): Promise<WorkflowTemplate> {
  return prisma.workflowTemplate.update({
    where: { id },
    data: { isActive: false },
  })
}
