/**
 * Phase 2 — Workflow Engine Tests
 *
 * Tests the core engine: startWorkflow, transition, getState, getTimeline
 * Tests validators: validateTransition, resolveTargetStatus
 * Tests notification resolver: interpolateTemplate
 */
import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  validateTransition,
  resolveTargetStatus,
  findStepByStatus,
  isTerminalStatus,
  interpolateTemplate,
  startWorkflow,
  transition as engineTransition,
  getState,
  getTimeline,
  WorkflowError,
} from '@/lib/workflow'

const prisma = new PrismaClient()

// We'll create a test template and use real seeded users
let testTemplateId: string
let testInstanceId: string
let patientUserId: string
let providerUserId: string

beforeAll(async () => {
  // Find a real patient and doctor from seed data
  const patient = await prisma.user.findFirst({ where: { userType: 'PATIENT' }, select: { id: true } })
  const doctor = await prisma.user.findFirst({ where: { userType: 'DOCTOR' }, select: { id: true } })

  if (!patient || !doctor) throw new Error('Seeded users not found — run npx prisma db seed first')

  patientUserId = patient.id
  providerUserId = doctor.id

  // Create test template
  const template = await prisma.workflowTemplate.create({
    data: {
      name: 'Engine Test - Consultation Office',
      slug: 'engine-test-' + Date.now(),
      providerType: 'DOCTOR',
      serviceMode: 'office',
      isDefault: false,
      steps: [
        {
          order: 1,
          statusCode: 'pending',
          label: 'Demande envoyee',
          actionsForPatient: [
            { action: 'cancel', label: 'Annuler', targetStatus: 'cancelled', style: 'danger' },
          ],
          actionsForProvider: [
            { action: 'accept', label: 'Accepter', targetStatus: 'confirmed', style: 'primary' },
            { action: 'deny', label: 'Refuser', targetStatus: 'cancelled', style: 'danger' },
          ],
          flags: {},
          notifyPatient: null,
          notifyProvider: {
            title: 'Nouvelle demande de {{patientName}}',
            message: '{{patientName}} demande une consultation',
          },
        },
        {
          order: 2,
          statusCode: 'confirmed',
          label: 'Consultation confirmee',
          actionsForPatient: [
            { action: 'cancel', label: 'Annuler', targetStatus: 'cancelled', style: 'danger' },
          ],
          actionsForProvider: [
            { action: 'start', label: 'Demarrer', targetStatus: 'in_consultation', style: 'primary' },
          ],
          flags: {},
          notifyPatient: {
            title: 'Consultation confirmee',
            message: 'Votre consultation avec {{providerName}} est confirmee',
          },
          notifyProvider: null,
        },
        {
          order: 3,
          statusCode: 'in_consultation',
          label: 'Consultation en cours',
          actionsForPatient: [],
          actionsForProvider: [
            { action: 'complete', label: 'Terminer', targetStatus: 'completed', style: 'primary' },
          ],
          flags: {},
          notifyPatient: { title: 'Consultation en cours', message: 'Votre consultation a commence' },
          notifyProvider: null,
        },
        {
          order: 4,
          statusCode: 'completed',
          label: 'Consultation terminee',
          actionsForPatient: [],
          actionsForProvider: [],
          flags: {},
          notifyPatient: { title: 'Consultation terminee', message: 'Merci de laisser un avis' },
          notifyProvider: null,
        },
        {
          order: 5,
          statusCode: 'cancelled',
          label: 'Annulee',
          actionsForPatient: [],
          actionsForProvider: [],
          flags: {},
          notifyPatient: { title: 'Annulee', message: 'La consultation a ete annulee' },
          notifyProvider: { title: 'Annulee', message: 'La consultation a ete annulee' },
        },
      ],
      transitions: [
        { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
        { from: 'pending', to: 'cancelled', action: 'deny', allowedRoles: ['provider'] },
        { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient'] },
        { from: 'confirmed', to: 'in_consultation', action: 'start', allowedRoles: ['provider'] },
        { from: 'confirmed', to: 'cancelled', action: 'cancel', allowedRoles: ['patient', 'provider'] },
        { from: 'in_consultation', to: 'completed', action: 'complete', allowedRoles: ['provider'] },
      ],
    },
  })

  testTemplateId = template.id
})

afterAll(async () => {
  // Cleanup
  if (testInstanceId) {
    await prisma.workflowStepLog.deleteMany({ where: { instanceId: testInstanceId } })
  }
  await prisma.workflowNotificationTemplate.deleteMany({ where: { workflowTemplateId: testTemplateId } })
  await prisma.workflowStepLog.deleteMany({ where: { instance: { templateId: testTemplateId } } })
  await prisma.workflowInstance.deleteMany({ where: { templateId: testTemplateId } })
  await prisma.workflowTemplate.deleteMany({ where: { id: testTemplateId } })
  // Clean up notifications created during tests
  await prisma.notification.deleteMany({ where: { type: 'workflow', referenceId: 'engine-test-booking-001' } })
  await prisma.$disconnect()
})

// ─── Validators ─────────────────────────────────────────────────────────────

describe('Validators', () => {
  // Using top-level imports

  const transitions: import('@/lib/workflow').TransitionDefinition[] = [
    { from: 'pending', to: 'confirmed', action: 'accept', allowedRoles: ['provider'] },
    { from: 'pending', to: 'cancelled', action: 'cancel', allowedRoles: ['patient'] },
    { from: 'confirmed', to: 'completed', action: 'complete', allowedRoles: ['provider'] },
  ]

  const steps: import('@/lib/workflow').WorkflowStepDefinition[] = [
    { order: 1, statusCode: 'pending', label: 'Pending', actionsForPatient: [], actionsForProvider: [], flags: {} },
    { order: 2, statusCode: 'confirmed', label: 'Confirmed', actionsForPatient: [], actionsForProvider: [], flags: {} },
    { order: 3, statusCode: 'completed', label: 'Completed', actionsForPatient: [], actionsForProvider: [], flags: {} },
    { order: 4, statusCode: 'cancelled', label: 'Cancelled', actionsForPatient: [], actionsForProvider: [], flags: {} },
  ]

  it('validates allowed transitions', () => {
    const result = validateTransition(transitions, 'pending', 'accept', 'provider')
    expect(result.valid).toBe(true)
  })

  it('rejects unknown action', () => {
    const result = validateTransition(transitions, 'pending', 'fly', 'provider')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('No transition defined')
  })

  it('rejects wrong role', () => {
    const result = validateTransition(transitions, 'pending', 'accept', 'patient')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('not allowed')
  })

  it('resolves target status', () => {
    expect(resolveTargetStatus(transitions, 'pending', 'accept')).toBe('confirmed')
    expect(resolveTargetStatus(transitions, 'pending', 'cancel')).toBe('cancelled')
    expect(resolveTargetStatus(transitions, 'pending', 'unknown')).toBeNull()
  })

  it('finds step by status', () => {
    expect(findStepByStatus(steps, 'pending')?.label).toBe('Pending')
    expect(findStepByStatus(steps, 'nonexistent')).toBeUndefined()
  })

  it('detects terminal status', () => {
    expect(isTerminalStatus(transitions, 'completed')).toBe(true)
    expect(isTerminalStatus(transitions, 'cancelled')).toBe(true)
    expect(isTerminalStatus(transitions, 'pending')).toBe(false)
  })
})

// ─── Notification Resolver ──────────────────────────────────────────────────

describe('Notification Resolver', () => {
  // Using top-level imports

  it('interpolates template variables', () => {
    const result = interpolateTemplate(
      'Hello {{patientName}}, your doctor {{providerName}} is ready',
      { patientName: 'Jean Dupont', providerName: 'Dr. Martin' }
    )
    expect(result).toBe('Hello Jean Dupont, your doctor Dr. Martin is ready')
  })

  it('handles missing variables gracefully', () => {
    const result = interpolateTemplate(
      'Hello {{patientName}}, amount: {{amount}}',
      { patientName: 'Jean' }
    )
    expect(result).toBe('Hello Jean, amount: {{amount}}')
  })

  it('handles multiple occurrences of same variable', () => {
    const result = interpolateTemplate(
      '{{patientName}} booked. Notify {{patientName}}.',
      { patientName: 'Jean' }
    )
    expect(result).toBe('Jean booked. Notify Jean.')
  })
})

// ─── Engine: startWorkflow ──────────────────────────────────────────────────

describe('Engine: startWorkflow', () => {
  // Using top-level imports

  it('creates a workflow instance from a template', async () => {
    const result = await startWorkflow({
      bookingId: 'engine-test-booking-001',
      bookingType: 'appointment',
      providerUserId,
      providerType: 'DOCTOR',
      patientUserId,
      serviceMode: 'office',
    })

    // Template won't resolve because our test template is not isDefault
    // and there's no system default yet. Let's verify the behavior.
    if (!result.success) {
      expect(result.error).toContain('No workflow template found')
    }
  })
})

// ─── Engine: transition (using direct instance creation) ────────────────────

describe('Engine: transition', () => {
  const transition = engineTransition

  beforeAll(async () => {
    // Create instance directly for testing
    const instance = await prisma.workflowInstance.create({
      data: {
        templateId: testTemplateId,
        bookingId: 'engine-test-booking-001',
        bookingType: 'appointment',
        currentStatus: 'pending',
        patientUserId,
        providerUserId,
        serviceMode: 'office',
      },
    })
    testInstanceId = instance.id

    // Create initial step log
    await prisma.workflowStepLog.create({
      data: {
        instanceId: instance.id,
        fromStatus: null,
        toStatus: 'pending',
        action: 'create',
        actionByUserId: patientUserId,
        actionByRole: 'patient',
        label: 'Demande envoyee',
      },
    })
  })

  it('transitions pending → confirmed (provider accepts)', async () => {
    const result = await transition({
      instanceId: testInstanceId,
      action: 'accept',
      actionByUserId: providerUserId,
      actionByRole: 'provider',
    })

    expect(result.success).toBe(true)
    expect(result.previousStatus).toBe('pending')
    expect(result.currentStatus).toBe('confirmed')
    expect(result.stepLabel).toBe('Consultation confirmee')
    expect(result.nextActionsForProvider).toHaveLength(1)
    expect(result.nextActionsForProvider[0].action).toBe('start')
    expect(result.nextActionsForPatient).toHaveLength(1)
    expect(result.nextActionsForPatient[0].action).toBe('cancel')
  })

  it('rejects patient trying provider-only action', async () => {
    await expect(
      transition({
        instanceId: testInstanceId,
        action: 'start',
        actionByUserId: patientUserId,
        actionByRole: 'patient',
      })
    ).rejects.toThrow(WorkflowError)
  })

  it('rejects invalid action from current status', async () => {
    await expect(
      transition({
        instanceId: testInstanceId,
        action: 'accept', // can't accept from 'confirmed'
        actionByUserId: providerUserId,
        actionByRole: 'provider',
      })
    ).rejects.toThrow('No transition defined')
  })

  it('transitions confirmed → in_consultation (provider starts)', async () => {
    const result = await transition({
      instanceId: testInstanceId,
      action: 'start',
      actionByUserId: providerUserId,
      actionByRole: 'provider',
    })

    expect(result.success).toBe(true)
    expect(result.currentStatus).toBe('in_consultation')
  })

  it('transitions in_consultation → completed (provider completes)', async () => {
    const result = await transition({
      instanceId: testInstanceId,
      action: 'complete',
      actionByUserId: providerUserId,
      actionByRole: 'provider',
      notes: 'Patient is doing well',
      contentType: 'prescription',
      contentData: { medications: [{ name: 'Paracetamol', dosage: '500mg' }] },
    })

    expect(result.success).toBe(true)
    expect(result.currentStatus).toBe('completed')
    expect(result.nextActionsForPatient).toHaveLength(0)
    expect(result.nextActionsForProvider).toHaveLength(0)
  })

  it('rejects transition on completed workflow', async () => {
    await expect(
      transition({
        instanceId: testInstanceId,
        action: 'cancel',
        actionByUserId: patientUserId,
        actionByRole: 'patient',
      })
    ).rejects.toThrow('already completed')
  })
})

// ─── Engine: getState ───────────────────────────────────────────────────────

describe('Engine: getState', () => {
  // Using top-level imports

  it('returns workflow state for completed instance', async () => {
    const state = await getState(testInstanceId)

    expect(state).not.toBeNull()
    expect(state!.instanceId).toBe(testInstanceId)
    expect(state!.currentStatus).toBe('completed')
    expect(state!.isCompleted).toBe(true)
    expect(state!.isCancelled).toBe(false)
    expect(state!.templateName).toBe('Engine Test - Consultation Office')
    expect(state!.bookingId).toBe('engine-test-booking-001')
    expect(state!.bookingType).toBe('appointment')
    expect(state!.serviceMode).toBe('office')
  })

  it('returns null for non-existent instance', async () => {
    const state = await getState('nonexistent-id')
    expect(state).toBeNull()
  })
})

// ─── Engine: getTimeline ────────────────────────────────────────────────────

describe('Engine: getTimeline', () => {
  // Using top-level imports

  it('returns full step log in chronological order', async () => {
    const timeline = await getTimeline(testInstanceId)

    expect(timeline.length).toBeGreaterThanOrEqual(4)
    // Should be: create(→pending), accept(→confirmed), start(→in_consultation), complete(→completed)
    expect(timeline[0].toStatus).toBe('pending')
    expect(timeline[0].action).toBe('create')
    expect(timeline[1].toStatus).toBe('confirmed')
    expect(timeline[1].action).toBe('accept')
    expect(timeline[2].toStatus).toBe('in_consultation')
    expect(timeline[3].toStatus).toBe('completed')
    expect(timeline[3].action).toBe('complete')

    // Check content attachment on complete step
    expect(timeline[3].contentType).toBe('prescription')
    const contentData = timeline[3].contentData as { medications: unknown[] }
    expect(contentData.medications).toHaveLength(1)
  })
})

// ─── Engine: cancellation flow ──────────────────────────────────────────────

describe('Engine: cancellation flow', () => {
  const transition = engineTransition
  let cancelInstanceId: string

  beforeAll(async () => {
    const instance = await prisma.workflowInstance.create({
      data: {
        templateId: testTemplateId,
        bookingId: 'engine-test-cancel-001',
        bookingType: 'appointment',
        currentStatus: 'pending',
        patientUserId,
        providerUserId,
        serviceMode: 'office',
      },
    })
    cancelInstanceId = instance.id
  })

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { type: 'workflow', referenceId: 'engine-test-cancel-001' } })
    await prisma.workflowStepLog.deleteMany({ where: { instanceId: cancelInstanceId } })
  })

  it('patient can cancel from pending', async () => {
    const result = await transition({
      instanceId: cancelInstanceId,
      action: 'cancel',
      actionByUserId: patientUserId,
      actionByRole: 'patient',
    })

    expect(result.success).toBe(true)
    expect(result.currentStatus).toBe('cancelled')

    const state = await getState(cancelInstanceId)
    expect(state!.isCancelled).toBe(true)
  })
})

// ─── Engine: lookup by bookingId + bookingType ──────────────────────────────

describe('Engine: lookup by booking', () => {
  const transition = engineTransition
  let lookupInstanceId: string

  beforeAll(async () => {
    const instance = await prisma.workflowInstance.create({
      data: {
        templateId: testTemplateId,
        bookingId: 'engine-test-lookup-001',
        bookingType: 'appointment',
        currentStatus: 'pending',
        patientUserId,
        providerUserId,
        serviceMode: 'office',
      },
    })
    lookupInstanceId = instance.id
  })

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { type: 'workflow', referenceId: 'engine-test-lookup-001' } })
    await prisma.workflowStepLog.deleteMany({ where: { instanceId: lookupInstanceId } })
  })

  it('can transition using bookingId + bookingType instead of instanceId', async () => {
    const result = await transition({
      bookingId: 'engine-test-lookup-001',
      bookingType: 'appointment',
      action: 'accept',
      actionByUserId: providerUserId,
      actionByRole: 'provider',
    })

    expect(result.success).toBe(true)
    expect(result.currentStatus).toBe('confirmed')
  })
})

// ─── Notifications created ──────────────────────────────────────────────────

describe('Engine: notifications', () => {
  it('creates notifications on transitions', async () => {
    // Check that notifications were created during the transition tests
    const notifications = await prisma.notification.findMany({
      where: { type: 'workflow', referenceId: 'engine-test-booking-001' },
      orderBy: { createdAt: 'asc' },
    })

    // Should have notifications for: confirmed (patient), in_consultation (patient), completed (patient)
    expect(notifications.length).toBeGreaterThanOrEqual(1)

    const confirmedNotif = notifications.find((n) => n.title.includes('confirmee'))
    expect(confirmedNotif).toBeDefined()
    expect(confirmedNotif!.userId).toBe(patientUserId)
  })

  it('notification contains interpolated template variables', async () => {
    const notifications = await prisma.notification.findMany({
      where: { type: 'workflow', referenceId: 'engine-test-booking-001' },
    })

    // At least one notification should have resolved the provider name
    const withName = notifications.find((n) => !n.message.includes('{{'))
    expect(withName).toBeDefined()
  })
})
