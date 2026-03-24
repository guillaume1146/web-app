/**
 * Workflow Registry — resolves which WorkflowTemplate to use for a given booking.
 * Priority: provider custom > regional admin > system default
 */
import prisma from '@/lib/db'
import type { WorkflowTemplate } from '@prisma/client'

export async function resolveTemplate(params: {
  platformServiceId?: string | null
  providerUserId: string
  providerType: string
  serviceMode: string
  regionCode?: string | null
}): Promise<WorkflowTemplate | null> {
  const { platformServiceId, providerUserId, providerType, serviceMode, regionCode } = params

  // 1. Provider's custom template for this service + mode
  if (platformServiceId) {
    const providerTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        platformServiceId,
        createdByProviderId: providerUserId,
        serviceMode,
        isActive: true,
      },
    })
    if (providerTemplate) return providerTemplate
  }

  // 2. Provider's custom template for this provider type + mode (no specific service)
  const providerGenericTemplate = await prisma.workflowTemplate.findFirst({
    where: {
      createdByProviderId: providerUserId,
      providerType,
      serviceMode,
      platformServiceId: null,
      isActive: true,
    },
  })
  if (providerGenericTemplate) return providerGenericTemplate

  // 3. Regional admin template for this service + mode
  if (platformServiceId && regionCode) {
    const regionalTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        platformServiceId,
        createdByAdminId: { not: null },
        regionCode,
        serviceMode,
        isActive: true,
      },
    })
    if (regionalTemplate) return regionalTemplate
  }

  // 4. Regional admin template for provider type + mode
  if (regionCode) {
    const regionalGenericTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        createdByAdminId: { not: null },
        providerType,
        serviceMode,
        regionCode,
        isActive: true,
      },
    })
    if (regionalGenericTemplate) return regionalGenericTemplate
  }

  // 5. System default for this specific service
  if (platformServiceId) {
    const systemServiceTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        platformServiceId,
        isDefault: true,
        serviceMode,
        isActive: true,
      },
    })
    if (systemServiceTemplate) return systemServiceTemplate
  }

  // 6. System default for provider type + mode
  const systemTemplate = await prisma.workflowTemplate.findFirst({
    where: {
      providerType,
      serviceMode,
      isDefault: true,
      isActive: true,
    },
  })

  return systemTemplate
}
