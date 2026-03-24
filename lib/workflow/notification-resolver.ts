/**
 * Notification Resolver — resolves template variables and finds the right notification template.
 */
import prisma from '@/lib/db'
import type { NotificationVariables, StepNotification } from './types'

/**
 * Resolve template variables in a string.
 * E.g., "Hello {{patientName}}" → "Hello Jean Dupont"
 */
export function interpolateTemplate(
  template: string,
  variables: Partial<NotificationVariables>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
  }
  return result
}

/**
 * Resolve notification content for a given step transition.
 * Priority: provider custom > admin custom > step default
 */
export async function resolveNotification(params: {
  workflowTemplateId: string
  statusCode: string
  targetRole: 'patient' | 'provider'
  defaultNotification: StepNotification | null | undefined
  createdByProviderId?: string | null
  variables: Partial<NotificationVariables>
}): Promise<{ title: string; message: string } | null> {
  const { workflowTemplateId, statusCode, targetRole, defaultNotification, createdByProviderId, variables } = params

  // 1. Check for provider-custom notification template
  if (createdByProviderId) {
    const custom = await prisma.workflowNotificationTemplate.findFirst({
      where: {
        workflowTemplateId,
        statusCode,
        targetRole,
        createdByProviderId,
      },
    })
    if (custom) {
      return {
        title: interpolateTemplate(custom.title, variables),
        message: interpolateTemplate(custom.message, variables),
      }
    }
  }

  // 2. Check for admin-custom notification template
  const adminCustom = await prisma.workflowNotificationTemplate.findFirst({
    where: {
      workflowTemplateId,
      statusCode,
      targetRole,
      createdByAdminId: { not: null },
      createdByProviderId: null,
    },
  })
  if (adminCustom) {
    return {
      title: interpolateTemplate(adminCustom.title, variables),
      message: interpolateTemplate(adminCustom.message, variables),
    }
  }

  // 3. Fall back to step default
  if (defaultNotification) {
    return {
      title: interpolateTemplate(defaultNotification.title, variables),
      message: interpolateTemplate(defaultNotification.message, variables),
    }
  }

  return null
}

/**
 * Build notification variables from user data.
 */
export async function buildNotificationVariables(params: {
  patientUserId: string
  providerUserId: string
  bookingId: string
  statusLabel: string
  amount?: number
}): Promise<Partial<NotificationVariables>> {
  const [patient, provider] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.patientUserId },
      select: { firstName: true, lastName: true },
    }),
    prisma.user.findUnique({
      where: { id: params.providerUserId },
      select: { firstName: true, lastName: true, userType: true },
    }),
  ])

  return {
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Patient',
    providerName: provider ? `${provider.firstName} ${provider.lastName}` : 'Provider',
    providerType: provider?.userType ?? '',
    bookingId: params.bookingId,
    status: params.statusLabel,
    amount: params.amount !== undefined ? `${params.amount} Rs` : '',
    serviceName: '',
    scheduledAt: '',
    eta: '',
    actionBy: '',
  }
}
