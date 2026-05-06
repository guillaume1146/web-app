import { Injectable } from '@nestjs/common';
import type { WorkflowStepDefinition, TransitionDefinition } from './types';
import { GenerateTemplateDto } from './dto/generate-template.dto';

export interface GeneratedTemplate {
  name: string;
  slug: string;
  description: string;
  serviceMode: string;
  providerType: string;
  paymentTiming: string;
  steps: WorkflowStepDefinition[];
  transitions: TransitionDefinition[];
  serviceConfig: Record<string, unknown>;
  suggestedAxes: Record<string, string>;
}

/**
 * Pure-logic service — no Prisma, no external calls.
 * Derives a complete WorkflowTemplate data structure from the 5 axes supplied
 * via GenerateTemplateDto, ready for the caller to persist if desired.
 */
@Injectable()
export class WorkflowGeneratorService {
  // ─── Public API ────────────────────────────────────────────────────────────

  generate(dto: GenerateTemplateDto): GeneratedTemplate {
    const serviceMode = this.deriveServiceMode(dto);
    const paymentTiming = this.derivePaymentTiming(serviceMode);
    const steps = this.buildSteps(dto);
    const transitions = this.buildTransitions(steps);
    const serviceConfig = this.buildServiceConfig(dto);
    const name = dto.name?.trim() || this.buildName(dto);
    const slug = this.buildSlug(name);
    const description = this.buildDescription(dto, serviceMode);

    return {
      name,
      slug,
      description,
      serviceMode,
      providerType: dto.providerType ?? '',
      paymentTiming,
      steps,
      transitions,
      serviceConfig,
      suggestedAxes: {
        location: dto.location,
        sample: dto.sample,
        careModel: dto.careModel,
        urgency: dto.urgency,
        recurrenceType: dto.recurrenceType,
      },
    };
  }

  // ─── Step Generation ───────────────────────────────────────────────────────

  private buildSteps(dto: GenerateTemplateDto): WorkflowStepDefinition[] {
    const steps: WorkflowStepDefinition[] = [];

    // Determine the next status after PENDING (for start action on CONFIRMED)
    const skipConfirmed = dto.urgency === 'urgent' || dto.urgency === 'emergency';

    // 1. PENDING — always first
    const nextAfterPending = skipConfirmed
      ? this.locationStepCode(dto)
      : 'confirmed';

    steps.push(this.makePendingStep(nextAfterPending));

    // 2. CONFIRMED — unless urgency === 'urgent' or 'emergency'
    if (!skipConfirmed) {
      const nextAfterConfirmed = dto.careModel === 'delegated'
        ? 'nurse_dispatched'
        : this.locationStepCode(dto);
      steps.push(this.makeConfirmedStep(nextAfterConfirmed, steps.length + 1));
    }

    // 3. Delegated care: NURSE_DISPATCHED + NURSE_ARRIVED
    if (dto.careModel === 'delegated') {
      steps.push(this.makeNurseDispatchedStep(steps.length + 1));
      steps.push(this.makeNurseArrivedStep(this.locationStepCode(dto), steps.length + 1));
    }

    // 4. Location-specific step
    const locationStep = this.makeLocationStep(dto, steps.length + 1);
    steps.push(locationStep);

    // 5. Sample step (if applicable)
    if (dto.sample !== 'none') {
      steps.push(this.makeSampleCollectedStep(dto.sample, steps.length + 1));

      // 6. Results step (always when sample !== 'none')
      steps.push(this.makeResultsReadyStep(steps.length + 1));
    }

    // 7. Async prescription step
    if (dto.location === 'async') {
      steps.push(this.makePrescriptionIssuedStep(steps.length + 1));
    }

    // 8. COMPLETED — always second-to-last
    steps.push(this.makeCompletedStep(steps.length + 1));

    // 9. CANCELLED — always last
    steps.push(this.makeCancelledStep(steps.length + 1));

    return steps;
  }

  // ─── Individual step builders ──────────────────────────────────────────────

  private makePendingStep(nextStatus: string): WorkflowStepDefinition {
    return {
      order: 1,
      statusCode: 'pending',
      label: 'Awaiting Confirmation',
      actionsForProvider: [
        { action: 'accept', label: 'Accept Booking', targetStatus: nextStatus, style: 'primary' },
        { action: 'decline', label: 'Decline', targetStatus: 'cancelled', style: 'danger' },
      ],
      actionsForPatient: [
        { action: 'cancel', label: 'Cancel Request', targetStatus: 'cancelled', style: 'danger' },
      ],
      flags: {},
    };
  }

  private makeConfirmedStep(nextStatus: string, order: number): WorkflowStepDefinition {
    return {
      order,
      statusCode: 'confirmed',
      label: 'Booking Confirmed',
      actionsForProvider: [
        { action: 'start', label: 'Start Session', targetStatus: nextStatus, style: 'primary' },
      ],
      actionsForPatient: [
        { action: 'cancel', label: 'Cancel', targetStatus: 'cancelled', style: 'danger' },
      ],
      flags: {},
    };
  }

  private makeNurseDispatchedStep(order: number): WorkflowStepDefinition {
    return {
      order,
      statusCode: 'nurse_dispatched',
      label: 'Provider Dispatched',
      actionsForProvider: [
        { action: 'arrived', label: 'Mark Arrived', targetStatus: 'nurse_arrived', style: 'primary' },
      ],
      actionsForPatient: [],
      flags: {},
    };
  }

  private makeNurseArrivedStep(nextStatus: string, order: number): WorkflowStepDefinition {
    return {
      order,
      statusCode: 'nurse_arrived',
      label: 'Provider Arrived',
      actionsForProvider: [
        { action: 'start', label: 'Start Session', targetStatus: nextStatus, style: 'primary' },
      ],
      actionsForPatient: [],
      flags: {},
    };
  }

  private makeLocationStep(dto: GenerateTemplateDto, order: number): WorkflowStepDefinition {
    switch (dto.location) {
      case 'video':
        return {
          order,
          statusCode: 'video_call_ready',
          label: 'Video Call Ready',
          actionsForPatient: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForProvider: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'in_progress', style: 'primary' },
            { action: 'complete', label: 'Complete Session', targetStatus: 'completed', style: 'secondary' },
          ],
          flags: { triggers_video_call: true },
        };
      case 'audio':
        return {
          order,
          statusCode: 'audio_call_ready',
          label: 'Audio Call Ready',
          actionsForPatient: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForProvider: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'in_progress', style: 'primary' },
            { action: 'complete', label: 'Complete Session', targetStatus: 'completed', style: 'secondary' },
          ],
          flags: { triggers_audio_call: true },
        };
      case 'async':
        return {
          order,
          statusCode: 'under_review',
          label: 'Under Review',
          actionsForProvider: [
            { action: 'complete_review', label: 'Complete Review', targetStatus: 'prescription_issued', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: {},
        };
      default:
        // home, office, urgent, emergency
        return {
          order,
          statusCode: 'in_progress',
          label: dto.urgency === 'emergency' ? 'Emergency Response' : 'In Progress',
          actionsForProvider: [
            { action: 'complete', label: 'Complete Session', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: {},
        };
    }
  }

  private makeSampleCollectedStep(sampleType: 'home' | 'office' | 'self_kit', order: number): WorkflowStepDefinition {
    const label = sampleType === 'self_kit' ? 'Sample Kit Sent' : 'Sample Collected';
    return {
      order,
      statusCode: 'sample_collected',
      label,
      actionsForProvider: [
        { action: 'send_to_lab', label: 'Send to Lab', targetStatus: 'results_ready', style: 'primary' },
      ],
      actionsForPatient: [],
      flags: { requires_content: 'lab_result' },
    };
  }

  private makeResultsReadyStep(order: number): WorkflowStepDefinition {
    return {
      order,
      statusCode: 'results_ready',
      label: 'Results Ready',
      actionsForProvider: [
        { action: 'send_results', label: 'Send Results', targetStatus: 'completed', style: 'primary' },
      ],
      actionsForPatient: [],
      flags: { requires_content: 'lab_result' },
    };
  }

  private makePrescriptionIssuedStep(order: number): WorkflowStepDefinition {
    return {
      order,
      statusCode: 'prescription_issued',
      label: 'Prescription Issued',
      actionsForProvider: [
        { action: 'complete', label: 'Mark Complete', targetStatus: 'completed', style: 'primary' },
      ],
      actionsForPatient: [],
      flags: {},
    };
  }

  private makeCompletedStep(order: number): WorkflowStepDefinition {
    return {
      order,
      statusCode: 'completed',
      label: 'Completed',
      isTerminal: true,
      actionsForProvider: [],
      actionsForPatient: [],
      flags: {},
    } as WorkflowStepDefinition & { isTerminal: boolean };
  }

  private makeCancelledStep(order: number): WorkflowStepDefinition {
    return {
      order,
      statusCode: 'cancelled',
      label: 'Cancelled',
      isTerminal: true,
      isCancellation: true,
      actionsForProvider: [],
      actionsForPatient: [],
      flags: {},
    } as WorkflowStepDefinition & { isTerminal: boolean; isCancellation: boolean };
  }

  // ─── Transition Generation ─────────────────────────────────────────────────

  private buildTransitions(steps: WorkflowStepDefinition[]): TransitionDefinition[] {
    const transitions: TransitionDefinition[] = [];
    const nonTerminalSteps = steps.filter(
      (s) => !(s as WorkflowStepDefinition & { isTerminal?: boolean }).isTerminal,
    );

    for (const step of nonTerminalSteps) {
      // Forward transitions: collect all actions from both patient and provider
      const allActions = [
        ...(step.actionsForProvider ?? []),
        ...(step.actionsForPatient ?? []),
      ];

      for (const action of allActions) {
        // Determine allowed roles based on which action array it came from
        const fromProvider = (step.actionsForProvider ?? []).some(
          (a) => a.action === action.action && a.targetStatus === action.targetStatus,
        );
        const fromPatient = (step.actionsForPatient ?? []).some(
          (a) => a.action === action.action && a.targetStatus === action.targetStatus,
        );

        const allowedRoles: Array<'patient' | 'provider' | 'system'> = [];
        if (fromProvider) allowedRoles.push('provider');
        if (fromPatient) allowedRoles.push('patient');

        // Deduplicate transitions with the same from/to/action
        const exists = transitions.some(
          (t) => t.from === step.statusCode && t.to === action.targetStatus && t.action === action.action,
        );
        if (!exists) {
          transitions.push({
            from: step.statusCode,
            to: action.targetStatus,
            action: action.action,
            allowedRoles,
          });
        }
      }
    }

    // All non-terminal steps allow 'cancel' → 'cancelled' (if not already covered by an action)
    for (const step of nonTerminalSteps) {
      const alreadyHasCancel = transitions.some(
        (t) => t.from === step.statusCode && t.to === 'cancelled',
      );
      if (!alreadyHasCancel) {
        transitions.push({
          from: step.statusCode,
          to: 'cancelled',
          action: 'cancel',
          allowedRoles: ['patient', 'provider', 'system'],
        });
      }
    }

    return transitions;
  }

  // ─── Derivation Helpers ────────────────────────────────────────────────────

  private deriveServiceMode(dto: GenerateTemplateDto): string {
    if (dto.urgency === 'emergency') return 'emergency';
    if (dto.urgency === 'urgent') return 'urgent';
    if (dto.careModel === 'delegated') return 'delegated';
    switch (dto.location) {
      case 'video': return 'video';
      case 'audio': return 'audio';
      case 'home': return 'home';
      case 'office': return 'office';
      case 'async': return 'async';
    }
  }

  private derivePaymentTiming(serviceMode: string): string {
    switch (serviceMode) {
      case 'office':
      case 'async':
        return 'ON_COMPLETION';
      default:
        return 'ON_ACCEPTANCE';
    }
  }

  private locationStepCode(dto: GenerateTemplateDto): string {
    switch (dto.location) {
      case 'video': return 'video_call_ready';
      case 'audio': return 'audio_call_ready';
      case 'async': return 'under_review';
      default: return 'in_progress';
    }
  }

  private buildServiceConfig(dto: GenerateTemplateDto): Record<string, unknown> {
    const recurrence: Record<string, unknown> = {
      type: dto.recurrenceType,
      interval: dto.recurrenceInterval ?? 1,
      sessionCount: dto.sessionCount ?? null,
      slotDuration: dto.slotDuration ?? 60,
    };
    if (dto.recurrenceType === 'recurring') {
      recurrence.frequency = dto.recurrenceFrequency ?? 'weekly';
    }
    return { recurrence };
  }

  // ─── Name / slug helpers ───────────────────────────────────────────────────

  private buildName(dto: GenerateTemplateDto): string {
    const parts: string[] = [];

    const locationLabel: Record<typeof dto.location, string> = {
      video: 'Video Consultation',
      audio: 'Audio Call',
      home: 'Home Visit',
      office: 'Office Visit',
      async: 'Async Consultation',
    };
    parts.push(locationLabel[dto.location]);

    if (dto.sample !== 'none') {
      parts.push('with Sample Collection');
    }

    if (dto.careModel === 'delegated') {
      parts.push('(Delegated)');
    }

    if (dto.urgency !== 'scheduled') {
      parts.push(`– ${dto.urgency.charAt(0).toUpperCase()}${dto.urgency.slice(1)}`);
    }

    if (dto.recurrenceType === 'recurring') {
      const freqLabel = dto.recurrenceFrequency
        ? `${dto.recurrenceFrequency.charAt(0).toUpperCase()}${dto.recurrenceFrequency.slice(1)}`
        : 'Recurring';
      parts.push(`– Recurring ${freqLabel}`);
    }

    return parts.join(' ');
  }

  private buildSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  private buildDescription(dto: GenerateTemplateDto, serviceMode: string): string {
    const parts: string[] = [
      `Auto-generated ${serviceMode} workflow.`,
      `Location: ${dto.location}.`,
      `Sample: ${dto.sample}.`,
      `Care model: ${dto.careModel}.`,
      `Urgency: ${dto.urgency}.`,
      `Recurrence: ${dto.recurrenceType}${dto.recurrenceFrequency ? ` (${dto.recurrenceFrequency})` : ''}.`,
    ];
    return parts.join(' ');
  }
}
