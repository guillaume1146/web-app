/**
 * Workflow Engine — Template Method Pattern
 *
 * Handles all status transitions for any booking type.
 * Each transition: validate → pre-flags → update → post-flags → log → notify → sync
 */
import prisma from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { createNotification } from '@/lib/notifications'
import { resolveTemplate } from './registry'
import {
  validateTransition,
  resolveTargetStatus,
  findStepByStatus,
  isTerminalStatus,
} from './validators'
import { resolveNotification, buildNotificationVariables } from './notification-resolver'
import type {
  TransitionInput,
  TransitionResult,
  TransitionDefinition,
  WorkflowStepDefinition,
  WorkflowState,
  StepFlags,
  StepFlagHandler,
  TransitionContext,
} from './types'
import { findInstanceById, findInstanceByBooking, createInstance, updateInstanceStatus } from './repositories/workflow-instance.repository'
import { createStepLog, findTimelineByInstance } from './repositories/workflow-step-log.repository'

// ─── Strategy Registry (step flag handlers) ─────────────────────────────────

const flagHandlers: Map<string, StepFlagHandler> = new Map()

export function registerFlagHandler(handler: StepFlagHandler) {
  flagHandlers.set(handler.flag, handler)
}

// ─── Booking Status Sync ────────────────────────────────────────────────────

const BOOKING_MODEL_MAP: Record<string, string> = {
  appointment: 'appointment',
  nurse_booking: 'nurseBooking',
  childcare_booking: 'childcareBooking',
  lab_test_booking: 'labTestBooking',
  emergency_booking: 'emergencyBooking',
  service_booking: 'serviceBooking',
}

async function syncBookingStatus(bookingId: string, bookingType: string, status: string) {
  const modelName = BOOKING_MODEL_MAP[bookingType]
  if (!modelName) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any)[modelName]
    if (model?.update) {
      await model.update({
        where: { id: bookingId },
        data: { status },
      })
    }
  } catch {
    // Booking may not exist or status field may not match — non-fatal
    console.warn(`Could not sync booking status: ${bookingType}/${bookingId} → ${status}`)
  }
}

// ─── Engine ─────────────────────────────────────────────────────────────────

/**
 * Create a new workflow instance when a booking is created.
 */
export async function startWorkflow(params: {
  bookingId: string
  bookingType: string
  platformServiceId?: string | null
  providerUserId: string
  providerType: string
  patientUserId: string
  serviceMode: 'office' | 'home' | 'video'
  regionCode?: string | null
  metadata?: Record<string, unknown>
}) {
  // Resolve which template to use
  const template = await resolveTemplate({
    platformServiceId: params.platformServiceId,
    providerUserId: params.providerUserId,
    providerType: params.providerType,
    serviceMode: params.serviceMode,
    regionCode: params.regionCode,
  })

  if (!template) {
    return { success: false as const, error: 'No workflow template found for this service and mode' }
  }

  const steps = template.steps as unknown as WorkflowStepDefinition[]
  const firstStep = steps.find((s) => s.order === 1) ?? steps[0]

  if (!firstStep) {
    return { success: false as const, error: 'Workflow template has no steps defined' }
  }

  const instance = await createInstance({
    templateId: template.id,
    bookingId: params.bookingId,
    bookingType: params.bookingType,
    currentStatus: firstStep.statusCode,
    patientUserId: params.patientUserId,
    providerUserId: params.providerUserId,
    serviceMode: params.serviceMode,
    metadata: params.metadata as Prisma.InputJsonValue,
  })

  // Create initial step log
  await createStepLog({
    instanceId: instance.id,
    fromStatus: null,
    toStatus: firstStep.statusCode,
    action: 'create',
    actionByUserId: params.patientUserId,
    actionByRole: 'patient',
    label: firstStep.label,
    message: 'Workflow started',
  })

  // Send initial notification (usually to provider: "New booking request")
  const variables = await buildNotificationVariables({
    patientUserId: params.patientUserId,
    providerUserId: params.providerUserId,
    bookingId: params.bookingId,
    statusLabel: firstStep.label,
  })

  if (firstStep.notifyProvider) {
    const resolved = await resolveNotification({
      workflowTemplateId: template.id,
      statusCode: firstStep.statusCode,
      targetRole: 'provider',
      defaultNotification: firstStep.notifyProvider,
      createdByProviderId: template.createdByProviderId,
      variables,
    })
    if (resolved) {
      await createNotification({
        userId: params.providerUserId,
        type: 'workflow',
        title: resolved.title,
        message: resolved.message,
        referenceId: params.bookingId,
        referenceType: params.bookingType,
      })
    }
  }

  return {
    success: true as const,
    instanceId: instance.id,
    templateId: template.id,
    currentStatus: firstStep.statusCode,
    stepLabel: firstStep.label,
  }
}

/**
 * Transition a workflow instance to the next status.
 */
export async function transition(input: TransitionInput): Promise<TransitionResult> {
  // 1. Load instance
  let instance
  if (input.instanceId) {
    instance = await findInstanceById(input.instanceId)
  } else if (input.bookingId && input.bookingType) {
    instance = await findInstanceByBooking(input.bookingId, input.bookingType)
  }

  if (!instance) {
    throw new WorkflowError('Workflow instance not found')
  }

  if (instance.completedAt || instance.cancelledAt) {
    throw new WorkflowError('Workflow is already completed or cancelled')
  }

  const template = instance.template
  const steps = template.steps as unknown as WorkflowStepDefinition[]
  const transitions = template.transitions as unknown as TransitionDefinition[]

  // 2. Validate transition
  const validation = validateTransition(transitions, instance.currentStatus, input.action, input.actionByRole)
  if (!validation.valid) {
    throw new WorkflowError(validation.error!)
  }

  // 3. Resolve target status
  const targetStatus = resolveTargetStatus(transitions, instance.currentStatus, input.action)
  if (!targetStatus) {
    throw new WorkflowError(`Cannot resolve target status for action "${input.action}"`)
  }

  const targetStep = findStepByStatus(steps, targetStatus)
  if (!targetStep) {
    throw new WorkflowError(`Step definition not found for status "${targetStatus}"`)
  }

  // 4. Build transition context
  const ctx: TransitionContext = {
    instanceId: instance.id,
    templateId: template.id,
    bookingId: instance.bookingId,
    bookingType: instance.bookingType,
    patientUserId: instance.patientUserId,
    providerUserId: instance.providerUserId,
    fromStatus: instance.currentStatus,
    toStatus: targetStatus,
    action: input.action,
    flags: targetStep.flags,
    input,
  }

  // 5. Execute PRE-transition flag handlers (validation)
  // Skip flag execution for self-transitions (e.g. leave_review on completed → completed)
  const isSelfTransition = instance.currentStatus === targetStatus
  const preErrors: string[] = []
  if (!isSelfTransition) {
    for (const [flagKey, handler] of flagHandlers) {
      if (targetStep.flags[flagKey as keyof StepFlags] && handler.validate) {
        const result = await handler.validate(ctx)
        if (!result.valid) {
          preErrors.push(...result.errors)
        }
      }
    }
    if (preErrors.length > 0) {
      throw new WorkflowError(`Pre-transition validation failed: ${preErrors.join(', ')}`)
    }
  }

  // 6. Execute transition in a transaction
  const triggeredActions: TransitionResult['triggeredActions'] = {}
  const notificationIds: TransitionResult['notification'] = {}

  // Update instance status
  const isCompleted = isTerminalStatus(transitions, targetStatus) && targetStatus !== 'cancelled'
  const isCancelled = targetStatus === 'cancelled'

  await updateInstanceStatus(instance.id, {
    currentStatus: targetStatus,
    previousStatus: instance.currentStatus,
    ...(isCompleted ? { completedAt: new Date() } : {}),
    ...(isCancelled ? { cancelledAt: new Date() } : {}),
  })

  // 7. Execute POST-transition flag handlers (skip for self-transitions)
  if (!isSelfTransition) {
    for (const [flagKey, handler] of flagHandlers) {
      if (targetStep.flags[flagKey as keyof StepFlags] && handler.execute) {
        const result = await handler.execute(ctx)
        if (result.videoCallId) triggeredActions.videoCallId = result.videoCallId
        if (result.stockCheckResult) triggeredActions.stockCheckResult = result.stockCheckResult
        if (result.stockSubtracted) triggeredActions.stockSubtracted = result.stockSubtracted
        if (result.paymentProcessed) triggeredActions.paymentProcessed = result.paymentProcessed
        if (result.refundProcessed) triggeredActions.refundProcessed = result.refundProcessed
        if (result.conversationId) triggeredActions.conversationId = result.conversationId
        if (result.reviewRequestSent) triggeredActions.reviewRequestSent = result.reviewRequestSent
      }
    }
  }

  // 8. Create step log
  const stepLog = await createStepLog({
    instanceId: instance.id,
    fromStatus: instance.currentStatus,
    toStatus: targetStatus,
    action: input.action,
    actionByUserId: input.actionByUserId,
    actionByRole: input.actionByRole,
    label: targetStep.label,
    message: input.notes,
    contentType: input.contentType,
    contentData: input.contentData as Prisma.InputJsonValue,
    triggeredVideoCallId: triggeredActions.videoCallId,
    triggeredStockActions: triggeredActions.stockSubtracted as Prisma.InputJsonValue,
  })

  // 9. Send notifications
  const variables = await buildNotificationVariables({
    patientUserId: instance.patientUserId,
    providerUserId: instance.providerUserId,
    bookingId: instance.bookingId,
    statusLabel: targetStep.label,
  })

  // Notify patient
  if (targetStep.notifyPatient) {
    const resolved = await resolveNotification({
      workflowTemplateId: template.id,
      statusCode: targetStatus,
      targetRole: 'patient',
      defaultNotification: targetStep.notifyPatient,
      createdByProviderId: template.createdByProviderId,
      variables,
    })
    if (resolved) {
      const notif = await createNotification({
        userId: instance.patientUserId,
        type: 'workflow',
        title: resolved.title,
        message: resolved.message,
        referenceId: instance.bookingId,
        referenceType: instance.bookingType,
      })
      notificationIds.patientNotificationId = notif?.id
    }
  }

  // Notify provider
  if (targetStep.notifyProvider) {
    const resolved = await resolveNotification({
      workflowTemplateId: template.id,
      statusCode: targetStatus,
      targetRole: 'provider',
      defaultNotification: targetStep.notifyProvider,
      createdByProviderId: template.createdByProviderId,
      variables,
    })
    if (resolved) {
      const notif = await createNotification({
        userId: instance.providerUserId,
        type: 'workflow',
        title: resolved.title,
        message: resolved.message,
        referenceId: instance.bookingId,
        referenceType: instance.bookingType,
      })
      notificationIds.providerNotificationId = notif?.id
    }
  }

  // 10. Sync booking model status
  await syncBookingStatus(instance.bookingId, instance.bookingType, targetStatus)

  // 11. Resolve next actions
  const currentStep = findStepByStatus(steps, targetStatus)

  return {
    success: true,
    instanceId: instance.id,
    previousStatus: instance.currentStatus,
    currentStatus: targetStatus,
    stepLabel: targetStep.label,
    nextActionsForPatient: currentStep?.actionsForPatient ?? [],
    nextActionsForProvider: currentStep?.actionsForProvider ?? [],
    notification: notificationIds,
    triggeredActions,
  }
}

/**
 * Get current workflow state and available actions.
 */
export async function getState(instanceId: string): Promise<WorkflowState | null> {
  const instance = await findInstanceById(instanceId)
  if (!instance) return null

  const template = instance.template
  const steps = template.steps as unknown as WorkflowStepDefinition[]
  const transitions = template.transitions as unknown as TransitionDefinition[]
  const currentStep = findStepByStatus(steps, instance.currentStatus)

  return {
    instanceId: instance.id,
    templateId: template.id,
    templateName: template.name,
    bookingId: instance.bookingId,
    bookingType: instance.bookingType,
    serviceMode: instance.serviceMode,
    currentStatus: instance.currentStatus,
    currentStepLabel: currentStep?.label ?? instance.currentStatus,
    currentStepFlags: currentStep?.flags ?? {},
    actionsForPatient: currentStep?.actionsForPatient ?? [],
    actionsForProvider: currentStep?.actionsForProvider ?? [],
    isCompleted: instance.completedAt !== null,
    isCancelled: instance.cancelledAt !== null,
    startedAt: instance.startedAt,
    completedAt: instance.completedAt,
  }
}

/**
 * Get full timeline for a workflow instance.
 */
export async function getTimeline(instanceId: string) {
  return findTimelineByInstance(instanceId)
}

// ─── Error Class ────────────────────────────────────────────────────────────

export class WorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkflowError'
  }
}
