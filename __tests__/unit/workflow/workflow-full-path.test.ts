/**
 * Comprehensive Workflow Integration Test
 *
 * Validates every seeded workflow template by:
 * 1. Loading the template from DB
 * 2. Walking through the happy-path transitions
 * 3. Verifying step flags are correctly configured and would fire
 * 4. Verifying self-transitions (leave_review, view_results) don't re-trigger flags
 * 5. Testing cancellation + refund paths
 */
import prisma from '@/lib/db'
import {
  validateTransition,
  resolveTargetStatus,
  findStepByStatus,
  isTerminalStatus,
} from '@/lib/workflow'
import type { WorkflowStepDefinition, TransitionDefinition, StepFlags } from '@/lib/workflow'

// ─── Helper types ────────────────────────────────────────────────────────────

interface TemplateData {
  id: string
  name: string
  slug: string
  providerType: string
  serviceMode: string
  steps: WorkflowStepDefinition[]
  transitions: TransitionDefinition[]
}

// ─── Load all templates ──────────────────────────────────────────────────────

let allTemplates: TemplateData[] = []

beforeAll(async () => {
  const raw = await prisma.workflowTemplate.findMany({
    where: { isDefault: true, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      providerType: true,
      serviceMode: true,
      steps: true,
      transitions: true,
    },
    orderBy: { providerType: 'asc' },
  })

  allTemplates = raw.map((t) => ({
    ...t,
    steps: t.steps as unknown as WorkflowStepDefinition[],
    transitions: t.transitions as unknown as TransitionDefinition[],
  }))
})

afterAll(async () => {
  await prisma.$disconnect()
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Workflow Template Completeness', () => {
  const expectedProviderTypes = [
    'DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
    'PHARMACIST', 'INSURANCE_REP', 'CAREGIVER', 'PHYSIOTHERAPIST',
    'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
  ]

  it('has at least one template per provider type', () => {
    for (const pt of expectedProviderTypes) {
      const templates = allTemplates.filter((t) => t.providerType === pt)
      expect(templates.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('all templates have steps with valid structure', () => {
    for (const tpl of allTemplates) {
      expect(tpl.steps.length).toBeGreaterThanOrEqual(2) // at least pending + one more
      for (const step of tpl.steps) {
        expect(step.order).toBeDefined()
        expect(step.statusCode).toBeTruthy()
        expect(step.label).toBeTruthy()
        expect(step.flags).toBeDefined()
        expect(step.actionsForPatient).toBeDefined()
        expect(step.actionsForProvider).toBeDefined()
      }
    }
  })

  it('all templates have transitions with valid structure', () => {
    for (const tpl of allTemplates) {
      expect(tpl.transitions.length).toBeGreaterThanOrEqual(1)
      for (const tr of tpl.transitions) {
        expect(tr.from).toBeTruthy()
        expect(tr.to).toBeTruthy()
        expect(tr.action).toBeTruthy()
        expect(tr.allowedRoles.length).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

describe('Workflow Step Actions Have Matching Transitions', () => {
  it('every step action has a corresponding transition definition', () => {
    const errors: string[] = []

    for (const tpl of allTemplates) {
      for (const step of tpl.steps) {
        const allActions = [
          ...step.actionsForPatient.map((a) => ({ ...a, role: 'patient' as const })),
          ...step.actionsForProvider.map((a) => ({ ...a, role: 'provider' as const })),
        ]

        for (const action of allActions) {
          const matchingTransition = tpl.transitions.find(
            (tr) =>
              tr.from === step.statusCode &&
              tr.action === action.action &&
              tr.to === action.targetStatus
          )

          if (!matchingTransition) {
            errors.push(
              `${tpl.slug}: step "${step.statusCode}" has action "${action.action}" → "${action.targetStatus}" but no matching transition`
            )
          }
        }
      }
    }

    if (errors.length > 0) {
      console.error('Missing transitions:\n' + errors.join('\n'))
    }
    expect(errors).toEqual([])
  })
})

describe('Workflow Flag Consistency', () => {
  const VALID_FLAGS: (keyof StepFlags)[] = [
    'triggers_video_call',
    'triggers_stock_check',
    'triggers_stock_subtract',
    'triggers_payment',
    'triggers_refund',
    'triggers_conversation',
    'triggers_review_request',
    'requires_prescription',
    'requires_content',
  ]

  it('all step flags use valid flag names', () => {
    for (const tpl of allTemplates) {
      for (const step of tpl.steps) {
        for (const flagKey of Object.keys(step.flags)) {
          expect(VALID_FLAGS).toContain(flagKey)
        }
      }
    }
  })

  it('triggers_payment appears on "confirmed" or equivalent step for payable services', () => {
    const payableTypes = [
      'DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN',
      'PHARMACIST', 'CAREGIVER', 'PHYSIOTHERAPIST',
      'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
    ]

    for (const tpl of allTemplates) {
      if (!payableTypes.includes(tpl.providerType)) continue

      const hasPayment = tpl.steps.some((s) => s.flags.triggers_payment)
      expect(hasPayment).toBe(true)
    }
  })

  it('triggers_review_request appears on completed/resolved step', () => {
    for (const tpl of allTemplates) {
      // Skip insurance — no review needed
      if (tpl.providerType === 'INSURANCE_REP') continue

      const completedStep = tpl.steps.find(
        (s) => s.statusCode === 'completed' || s.statusCode === 'resolved'
      )
      if (completedStep) {
        expect(completedStep.flags.triggers_review_request).toBe(true)
      }
    }
  })

  it('triggers_refund appears on cancelled step for payable services', () => {
    const payableTypes = [
      'DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN',
      'PHARMACIST', 'CAREGIVER', 'PHYSIOTHERAPIST',
      'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
    ]

    for (const tpl of allTemplates) {
      if (!payableTypes.includes(tpl.providerType)) continue

      const cancelledStep = tpl.steps.find((s) => s.statusCode === 'cancelled')
      if (cancelledStep) {
        expect(cancelledStep.flags.triggers_refund).toBe(true)
      }
    }
  })

  it('triggers_video_call appears on video templates at call_ready step', () => {
    const videoTemplates = allTemplates.filter((t) => t.serviceMode === 'video')

    for (const tpl of videoTemplates) {
      const callReadyStep = tpl.steps.find((s) => s.statusCode === 'call_ready')
      if (callReadyStep) {
        expect(callReadyStep.flags.triggers_video_call).toBe(true)
      }
    }
  })

  it('triggers_conversation appears alongside triggers_payment for consultation services', () => {
    // Pharmacy orders don't need a conversation — only consultation-type services do
    const consultationTemplates = allTemplates.filter(
      (t) => t.providerType !== 'PHARMACIST' && t.providerType !== 'INSURANCE_REP'
    )

    for (const tpl of consultationTemplates) {
      const paymentStep = tpl.steps.find((s) => s.flags.triggers_payment)
      if (paymentStep) {
        expect(paymentStep.flags.triggers_conversation).toBe(true)
      }
    }
  })

  it('pharmacy templates have stock flags', () => {
    const pharmaTemplates = allTemplates.filter((t) => t.providerType === 'PHARMACIST')

    for (const tpl of pharmaTemplates) {
      const hasStockCheck = tpl.steps.some((s) => s.flags.triggers_stock_check)
      const hasStockSubtract = tpl.steps.some((s) => s.flags.triggers_stock_subtract)

      // At least stock subtract should exist in all pharmacy workflows
      expect(hasStockSubtract).toBe(true)

      // Pickup workflow should also have stock check
      if (tpl.serviceMode === 'office') {
        expect(hasStockCheck).toBe(true)
      }
    }
  })

  it('pharmacy pickup has requires_prescription on prescription_review', () => {
    const pickupTpl = allTemplates.find((t) => t.slug === 'pharmacist-order-office')
    expect(pickupTpl).toBeDefined()

    const rxStep = pickupTpl!.steps.find((s) => s.statusCode === 'prescription_review')
    expect(rxStep).toBeDefined()
    expect(rxStep!.flags.requires_prescription).toBe(true)
  })

  it('pharmacy delivery has requires_prescription on prescription_review', () => {
    const deliveryTpl = allTemplates.find((t) => t.slug === 'pharmacist-order-home')
    expect(deliveryTpl).toBeDefined()

    const rxStep = deliveryTpl!.steps.find((s) => s.statusCode === 'prescription_review')
    expect(rxStep).toBeDefined()
    expect(rxStep!.flags.requires_prescription).toBe(true)
  })
})

describe('Workflow Happy Path Validation', () => {
  it('standard office: pending → confirmed → waiting_room → in_progress → completed', () => {
    const tpl = allTemplates.find((t) => t.slug === 'doctor-standard-office')!
    const path = ['pending', 'confirmed', 'waiting_room', 'in_progress', 'completed']
    const actions = ['accept', 'check_in', 'start', 'complete']
    const roles: ('patient' | 'provider')[] = ['provider', 'provider', 'provider', 'provider']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], roles[i])
      expect(v.valid).toBe(true)
      const target = resolveTargetStatus(tpl.transitions, path[i], actions[i])
      expect(target).toBe(path[i + 1])
    }

    // Verify terminal
    expect(isTerminalStatus(tpl.transitions, 'completed')).toBe(false) // has leave_review self-transition
  })

  it('standard home: pending → confirmed → provider_travelling → arrived → in_progress → completed', () => {
    const tpl = allTemplates.find((t) => t.slug === 'doctor-standard-home')!
    const path = ['pending', 'confirmed', 'provider_travelling', 'provider_arrived', 'in_progress', 'completed']
    const actions = ['accept', 'depart', 'arrived', 'start', 'complete']
    const roles: ('patient' | 'provider')[] = ['provider', 'provider', 'provider', 'provider', 'provider']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], roles[i])
      expect(v.valid).toBe(true)
      const target = resolveTargetStatus(tpl.transitions, path[i], actions[i])
      expect(target).toBe(path[i + 1])
    }
  })

  it('standard video: pending → confirmed → call_ready → in_call → completed', () => {
    const tpl = allTemplates.find((t) => t.slug === 'doctor-standard-video')!
    const path = ['pending', 'confirmed', 'call_ready', 'in_call', 'completed']
    const actions = ['accept', 'prepare_call', 'join_call', 'end_call']
    const roles: ('patient' | 'provider')[] = ['provider', 'provider', 'provider', 'provider']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], roles[i])
      expect(v.valid).toBe(true)
    }

    // Verify video call flag on call_ready
    const callReady = findStepByStatus(tpl.steps, 'call_ready')
    expect(callReady?.flags.triggers_video_call).toBe(true)
  })

  it('pharmacy pickup: full path with stock + prescription flags', () => {
    const tpl = allTemplates.find((t) => t.slug === 'pharmacist-order-office')!
    const path = ['pending', 'prescription_review', 'stock_check', 'order_confirmed', 'preparing', 'ready_for_pickup', 'completed']
    const actions = ['review', 'stock_check', 'confirm', 'prepare', 'ready', 'picked_up']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], 'provider')
      expect(v.valid).toBe(true)
      const target = resolveTargetStatus(tpl.transitions, path[i], actions[i])
      expect(target).toBe(path[i + 1])
    }

    // Verify pharmacy-specific flags
    expect(findStepByStatus(tpl.steps, 'prescription_review')?.flags.requires_prescription).toBe(true)
    expect(findStepByStatus(tpl.steps, 'stock_check')?.flags.triggers_stock_check).toBe(true)
    expect(findStepByStatus(tpl.steps, 'order_confirmed')?.flags.triggers_payment).toBe(true)
    expect(findStepByStatus(tpl.steps, 'order_confirmed')?.flags.triggers_stock_subtract).toBe(true)
  })

  it('lab test office: full path with lab_result content requirement', () => {
    const tpl = allTemplates.find((t) => t.slug === 'lab_technician-test-office')!
    const path = ['pending', 'confirmed', 'sample_collection', 'analysis_in_progress', 'quality_check', 'results_ready', 'completed']
    const actions = ['accept', 'collect', 'start_analysis', 'enter_results', 'validate', 'complete']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], 'provider')
      expect(v.valid).toBe(true)
    }

    expect(findStepByStatus(tpl.steps, 'results_ready')?.flags.requires_content).toBe('lab_result')
  })

  it('emergency response: full path from pending to resolved', () => {
    const tpl = allTemplates.find((t) => t.slug === 'emergency_worker-response-home')!
    const path = ['pending', 'dispatched', 'en_route', 'arrived_on_scene', 'patient_assessment', 'first_aid', 'stabilized', 'resolved']
    const actions = ['accept', 'en_route', 'arrived', 'assess', 'first_aid', 'stabilized', 'resolve']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], 'provider')
      expect(v.valid).toBe(true)
      const target = resolveTargetStatus(tpl.transitions, path[i], actions[i])
      expect(target).toBe(path[i + 1])
    }

    // Conversation on dispatched
    expect(findStepByStatus(tpl.steps, 'dispatched')?.flags.triggers_conversation).toBe(true)
    // Review on resolved
    expect(findStepByStatus(tpl.steps, 'resolved')?.flags.triggers_review_request).toBe(true)
  })

  it('insurance claim: full path with document loop', () => {
    const tpl = allTemplates.find((t) => t.slug === 'insurance_rep-claim-office')!

    // Happy path: pending → document_review → assessment → approved
    let v = validateTransition(tpl.transitions, 'pending', 'review', 'provider')
    expect(v.valid).toBe(true)
    v = validateTransition(tpl.transitions, 'document_review', 'docs_ok', 'provider')
    expect(v.valid).toBe(true)
    v = validateTransition(tpl.transitions, 'assessment', 'approve', 'provider')
    expect(v.valid).toBe(true)

    // Document request loop: document_review → additional_info → document_review
    v = validateTransition(tpl.transitions, 'document_review', 'request_docs', 'provider')
    expect(v.valid).toBe(true)
    v = validateTransition(tpl.transitions, 'additional_info', 'submit_docs', 'patient')
    expect(v.valid).toBe(true)

    // Rejection + contest: assessment → rejected → document_review
    v = validateTransition(tpl.transitions, 'assessment', 'reject', 'provider')
    expect(v.valid).toBe(true)
    v = validateTransition(tpl.transitions, 'rejected', 'contest', 'patient')
    expect(v.valid).toBe(true)
  })

  it('dental procedure: full path with care_notes requirement', () => {
    const tpl = allTemplates.find((t) => t.slug === 'dentist-procedure-office')!
    const path = ['pending', 'confirmed', 'anesthesia', 'dental_procedure', 'post_procedure', 'completed']
    const actions = ['accept', 'anesthesia', 'start_procedure', 'end_procedure', 'send_instructions']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], 'provider')
      expect(v.valid).toBe(true)
    }

    expect(findStepByStatus(tpl.steps, 'post_procedure')?.flags.requires_content).toBe('care_notes')
  })

  it('optometrist fundus: full path with report requirement', () => {
    const tpl = allTemplates.find((t) => t.slug === 'optometrist-fundus-office')!
    const path = ['pending', 'confirmed', 'pupil_dilation', 'fundus_exam', 'report_ready', 'completed']
    const actions = ['accept', 'dilate', 'exam', 'report', 'complete']

    for (let i = 0; i < actions.length; i++) {
      const v = validateTransition(tpl.transitions, path[i], actions[i], 'provider')
      expect(v.valid).toBe(true)
    }

    expect(findStepByStatus(tpl.steps, 'report_ready')?.flags.requires_content).toBe('report')
  })
})

describe('Workflow Cancellation Paths', () => {
  it('patient can cancel from pending on all payable templates', () => {
    const payableTemplates = allTemplates.filter((t) =>
      ['DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN', 'PHARMACIST',
       'CAREGIVER', 'PHYSIOTHERAPIST', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST'].includes(t.providerType)
    )

    for (const tpl of payableTemplates) {
      const v = validateTransition(tpl.transitions, 'pending', 'cancel', 'patient')
      expect(v.valid).toBe(true)

      const target = resolveTargetStatus(tpl.transitions, 'pending', 'cancel')
      expect(target).toBe('cancelled')

      // Cancelled step should have triggers_refund
      const cancelledStep = findStepByStatus(tpl.steps, 'cancelled')
      if (cancelledStep) {
        expect(cancelledStep.flags.triggers_refund).toBe(true)
      }
    }
  })

  it('provider can deny from pending', () => {
    // Most templates support deny from pending
    const deniableTemplates = allTemplates.filter((t) =>
      t.transitions.some((tr) => tr.from === 'pending' && tr.action === 'deny')
    )

    for (const tpl of deniableTemplates) {
      const v = validateTransition(tpl.transitions, 'pending', 'deny', 'provider')
      expect(v.valid).toBe(true)
    }
  })
})

describe('Self-Transition Safety', () => {
  it('leave_review on completed is a self-transition', () => {
    const tpl = allTemplates.find((t) => t.slug === 'doctor-standard-office')!

    const v = validateTransition(tpl.transitions, 'completed', 'leave_review', 'patient')
    expect(v.valid).toBe(true)

    const target = resolveTargetStatus(tpl.transitions, 'completed', 'leave_review')
    expect(target).toBe('completed') // self-transition — flags should NOT re-fire
  })

  it('view_results on results_ready is a self-transition', () => {
    const tpl = allTemplates.find((t) => t.slug === 'lab_technician-test-office')!

    const v = validateTransition(tpl.transitions, 'results_ready', 'view_results', 'patient')
    expect(v.valid).toBe(true)

    const target = resolveTargetStatus(tpl.transitions, 'results_ready', 'view_results')
    expect(target).toBe('results_ready')
  })

  it('view_report on report_ready is a self-transition', () => {
    const tpl = allTemplates.find((t) => t.slug === 'optometrist-fundus-office')!

    const v = validateTransition(tpl.transitions, 'report_ready', 'view_report', 'patient')
    expect(v.valid).toBe(true)

    const target = resolveTargetStatus(tpl.transitions, 'report_ready', 'view_report')
    expect(target).toBe('report_ready')
  })
})

describe('All Provider Types Have Standard Mode Coverage', () => {
  const standardProviders = [
    'DOCTOR', 'NURSE', 'NANNY', 'CAREGIVER',
    'PHYSIOTHERAPIST', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
  ]

  for (const pt of standardProviders) {
    it(`${pt} has office, home, and video templates`, () => {
      const templates = allTemplates.filter((t) => t.providerType === pt)
      const modes = templates.map((t) => t.serviceMode)

      expect(modes).toContain('office')
      expect(modes).toContain('home')
      expect(modes).toContain('video')
    })
  }
})
