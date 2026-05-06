import { Injectable } from '@nestjs/common';
import type { WorkflowStepDefinition, TransitionDefinition } from './types';
import { GenerateTemplateDto, type OutputType } from './dto/generate-template.dto';

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
 * Derives a complete WorkflowTemplate data structure from all axes supplied
 * via GenerateTemplateDto, covering every possible provider service scenario.
 *
 * Axes handled:
 *   Location      home | office | video | audio | async
 *   Sample        none | home | office | self_kit
 *   CareModel     single | delegated | group | multi
 *   Urgency       scheduled | urgent | emergency
 *   Recurrence    once | recurring (+ frequency / interval / sessions)
 *   OutputType    none | exam_report | lab_result | prescription |
 *                 eye_prescription | care_notes | exercise_plan | meal_plan
 *   Payment       paymentTimingOverride | auto-derived
 *   Access        requiresPrescription | isHealthShop
 */
@Injectable()
export class WorkflowGeneratorService {
  // ─── Public API ────────────────────────────────────────────────────────────

  generate(dto: GenerateTemplateDto): GeneratedTemplate {
    const serviceMode = this.deriveServiceMode(dto);
    const paymentTiming = this.derivePaymentTiming(serviceMode, dto);
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
        outputType: dto.outputType ?? 'none',
      },
    };
  }

  // ─── Step Generation ───────────────────────────────────────────────────────

  private buildSteps(dto: GenerateTemplateDto): WorkflowStepDefinition[] {
    const steps: WorkflowStepDefinition[] = [];
    const skipConfirmed = dto.urgency === 'urgent' || dto.urgency === 'emergency';
    const outputType: OutputType = dto.outputType ?? 'none';
    const hasSample = dto.sample !== 'none';
    // output step fires when type is set and not already covered by sample steps
    const hasStandaloneOutput = outputType !== 'none' && !(outputType === 'lab_result' && hasSample);

    // What the location step transitions to (after sample/output resolution)
    const nextAfterSample = hasStandaloneOutput ? this.outputStepCode(outputType) : 'completed';
    const nextAfterLocation = hasSample
      ? 'sample_collected'
      : hasStandaloneOutput
      ? this.outputStepCode(outputType)
      : 'completed';

    // 1. PENDING — always first
    const nextAfterPending = skipConfirmed
      ? this.firstActiveStepCode(dto)
      : 'confirmed';
    steps.push(this.makePendingStep(nextAfterPending));

    // 2. CONFIRMED — unless urgent / emergency
    if (!skipConfirmed) {
      const nextAfterConfirmed = this.firstActiveStepCode(dto);
      steps.push(this.makeConfirmedStep(nextAfterConfirmed));
    }

    // 3. Delegated care: provider dispatches a delegate (nurse)
    if (dto.careModel === 'delegated') {
      steps.push(this.makeNurseDispatchedStep());
      steps.push(this.makeNurseArrivedStep(this.locationStepCode(dto)));
    }

    // 4. Multi-provider: coordination step before the live session
    if (dto.careModel === 'multi') {
      steps.push(this.makeCoordinatingStep(this.locationStepCode(dto)));
    }

    // 5. Location / session step (also handles group care model)
    steps.push(this.makeLocationStep(dto, nextAfterLocation));

    // 6. Sample collection steps (both steps appear together)
    if (hasSample) {
      steps.push(this.makeSampleCollectedStep(dto.sample as 'home' | 'office' | 'self_kit'));
      steps.push(this.makeResultsReadyStep(nextAfterSample));
    }

    // 7. Clinical output step
    const outputStep = this.makeOutputStep(outputType, hasSample);
    if (outputStep) steps.push(outputStep);

    // 8. Terminal steps — always last two, in this order
    steps.push(this.makeCompletedStep());
    steps.push(this.makeCancelledStep());

    // Renumber orders sequentially from 1
    steps.forEach((s, i) => { s.order = i + 1; });

    return steps;
  }

  // ─── Individual step builders ──────────────────────────────────────────────

  private makePendingStep(nextStatus: string): WorkflowStepDefinition {
    return {
      order: 0, // renumbered later
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

  private makeConfirmedStep(nextStatus: string): WorkflowStepDefinition {
    return {
      order: 0,
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

  private makeNurseDispatchedStep(): WorkflowStepDefinition {
    return {
      order: 0,
      statusCode: 'nurse_dispatched',
      label: 'Provider Dispatched',
      actionsForProvider: [
        { action: 'arrived', label: 'Mark Arrived', targetStatus: 'nurse_arrived', style: 'primary' },
      ],
      actionsForPatient: [],
      flags: {},
    };
  }

  private makeNurseArrivedStep(nextStatus: string): WorkflowStepDefinition {
    return {
      order: 0,
      statusCode: 'nurse_arrived',
      label: 'Provider Arrived',
      actionsForProvider: [
        { action: 'start', label: 'Start Session', targetStatus: nextStatus, style: 'primary' },
      ],
      actionsForPatient: [],
      flags: {},
    };
  }

  private makeCoordinatingStep(nextStatus: string): WorkflowStepDefinition {
    return {
      order: 0,
      statusCode: 'coordinating',
      label: 'Coordinating Team',
      actionsForProvider: [
        { action: 'ready', label: 'All Providers Ready', targetStatus: nextStatus, style: 'primary' },
      ],
      actionsForPatient: [],
      flags: {},
    };
  }

  private makeLocationStep(dto: GenerateTemplateDto, nextAfterLocation: string): WorkflowStepDefinition {
    // Group care model replaces the location step with a session placeholder
    if (dto.careModel === 'group') {
      const isVideo = dto.location === 'video';
      const isAudio = dto.location === 'audio';
      return {
        order: 0,
        statusCode: 'session_open',
        label: 'Session Open',
        actionsForProvider: [
          { action: 'close_session', label: 'Close Session', targetStatus: nextAfterLocation, style: 'primary' },
        ],
        actionsForPatient: [],
        flags: isVideo ? { triggers_video_call: true } : isAudio ? { triggers_audio_call: true } : {},
      };
    }

    switch (dto.location) {
      case 'video':
        return {
          order: 0,
          statusCode: 'video_call_ready',
          label: 'Video Call Ready',
          actionsForPatient: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'in_progress', style: 'primary' },
          ],
          actionsForProvider: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'in_progress', style: 'primary' },
            { action: 'complete', label: 'Complete Session', targetStatus: nextAfterLocation, style: 'secondary' },
          ],
          flags: { triggers_video_call: true },
        };

      case 'audio':
        return {
          order: 0,
          statusCode: 'audio_call_ready',
          label: 'Audio Call Ready',
          actionsForPatient: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'in_progress', style: 'primary' },
          ],
          actionsForProvider: [
            { action: 'join_call', label: 'Join Call', targetStatus: 'in_progress', style: 'primary' },
            { action: 'complete', label: 'Complete Session', targetStatus: nextAfterLocation, style: 'secondary' },
          ],
          flags: { triggers_audio_call: true },
        };

      case 'async':
        return {
          order: 0,
          statusCode: 'under_review',
          label: 'Under Review',
          actionsForProvider: [
            { action: 'complete_review', label: 'Complete Review', targetStatus: nextAfterLocation, style: 'primary' },
          ],
          actionsForPatient: [],
          flags: {},
        };

      default:
        // home, office, urgent dispatch, emergency response
        return {
          order: 0,
          statusCode: 'in_progress',
          label: dto.urgency === 'emergency' ? 'Emergency Response' : 'In Progress',
          actionsForProvider: [
            { action: 'complete', label: 'Complete Session', targetStatus: nextAfterLocation, style: 'primary' },
          ],
          actionsForPatient: [],
          flags: {},
        };
    }
  }

  private makeSampleCollectedStep(sampleType: 'home' | 'office' | 'self_kit'): WorkflowStepDefinition {
    const label = sampleType === 'self_kit' ? 'Sample Kit Sent' : 'Sample Collected';
    return {
      order: 0,
      statusCode: 'sample_collected',
      label,
      actionsForProvider: [
        { action: 'send_to_lab', label: 'Send to Lab', targetStatus: 'results_ready', style: 'primary' },
      ],
      actionsForPatient: [],
      flags: {},
    };
  }

  private makeResultsReadyStep(nextStatus: string): WorkflowStepDefinition {
    return {
      order: 0,
      statusCode: 'results_ready',
      label: 'Results Ready',
      actionsForProvider: [
        { action: 'send_results', label: 'Send Results', targetStatus: nextStatus, style: 'primary' },
      ],
      actionsForPatient: [],
      flags: { requires_content: 'lab_result' },
    };
  }

  /**
   * Builds the clinical output step for the service.
   * Returns null when no output step is needed:
   *   - outputType is 'none'
   *   - outputType is 'lab_result' AND sample steps already cover it
   */
  private makeOutputStep(outputType: OutputType, hasSample: boolean): WorkflowStepDefinition | null {
    // lab_result is already covered by the sample steps when sample !== 'none'
    if (outputType === 'lab_result' && hasSample) return null;

    switch (outputType) {
      case 'exam_report':
        return {
          order: 0,
          statusCode: 'exam_complete',
          label: 'Exam Complete',
          actionsForProvider: [
            { action: 'complete', label: 'Submit Report', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: { requires_content: 'report' },
        };

      case 'prescription':
        return {
          order: 0,
          statusCode: 'prescription_issued',
          label: 'Prescription Issued',
          actionsForProvider: [
            { action: 'complete', label: 'Mark Complete', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: {},
        };

      case 'eye_prescription':
        return {
          order: 0,
          statusCode: 'eye_prescription_written',
          label: 'Eye Prescription Written',
          actionsForProvider: [
            { action: 'complete', label: 'Submit Prescription', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: { requires_content: 'eye_prescription' },
        };

      case 'care_notes':
        return {
          order: 0,
          statusCode: 'care_notes_written',
          label: 'Care Notes Written',
          actionsForProvider: [
            { action: 'complete', label: 'Submit Notes', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: { requires_content: 'care_notes' },
        };

      case 'exercise_plan':
        return {
          order: 0,
          statusCode: 'treatment_plan_created',
          label: 'Treatment Plan Created',
          actionsForProvider: [
            { action: 'complete', label: 'Submit Plan', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: { requires_content: 'exercise_plan' },
        };

      case 'meal_plan':
        return {
          order: 0,
          statusCode: 'meal_plan_created',
          label: 'Meal Plan Created',
          actionsForProvider: [
            { action: 'complete', label: 'Submit Plan', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: { requires_content: 'meal_plan' },
        };

      case 'lab_result':
        // sample === 'none' — standalone results step (e.g. re-send of external results)
        return {
          order: 0,
          statusCode: 'results_ready',
          label: 'Results Ready',
          actionsForProvider: [
            { action: 'send_results', label: 'Send Results', targetStatus: 'completed', style: 'primary' },
          ],
          actionsForPatient: [],
          flags: { requires_content: 'lab_result' },
        };

      case 'none':
      default:
        return null;
    }
  }

  private makeCompletedStep(): WorkflowStepDefinition {
    return {
      order: 0,
      statusCode: 'completed',
      label: 'Completed',
      isTerminal: true,
      actionsForProvider: [],
      actionsForPatient: [],
      flags: {},
    } as WorkflowStepDefinition & { isTerminal: boolean };
  }

  private makeCancelledStep(): WorkflowStepDefinition {
    return {
      order: 0,
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
      const allActions = [
        ...(step.actionsForProvider ?? []),
        ...(step.actionsForPatient ?? []),
      ];

      for (const action of allActions) {
        const fromProvider = (step.actionsForProvider ?? []).some(
          (a) => a.action === action.action && a.targetStatus === action.targetStatus,
        );
        const fromPatient = (step.actionsForPatient ?? []).some(
          (a) => a.action === action.action && a.targetStatus === action.targetStatus,
        );

        const allowedRoles: Array<'patient' | 'provider' | 'system'> = [];
        if (fromProvider) allowedRoles.push('provider');
        if (fromPatient) allowedRoles.push('patient');

        const exists = transitions.some(
          (t) => t.from === step.statusCode && t.to === action.targetStatus && t.action === action.action,
        );
        if (!exists) {
          transitions.push({ from: step.statusCode, to: action.targetStatus, action: action.action, allowedRoles });
        }
      }
    }

    // Every non-terminal step can be cancelled (unless already covered by an explicit action)
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
    if (dto.careModel === 'multi') return 'multi';
    if (dto.careModel === 'group') return 'group';
    switch (dto.location) {
      case 'video': return 'video';
      case 'audio': return 'audio';
      case 'home': return 'home';
      case 'office': return 'office';
      case 'async': return 'async';
    }
  }

  private derivePaymentTiming(serviceMode: string, dto: GenerateTemplateDto): string {
    // Explicit override always wins
    if (dto.paymentTimingOverride) return dto.paymentTimingOverride;
    // Post-paid: office visits and async consultations collect after delivery
    if (serviceMode === 'office' || serviceMode === 'async') return 'ON_COMPLETION';
    // Pre-paid: all other modes charge on acceptance
    return 'ON_ACCEPTANCE';
  }

  /** Status code of the first non-confirmed active step (what PENDING / CONFIRMED transitions to). */
  private firstActiveStepCode(dto: GenerateTemplateDto): string {
    if (dto.careModel === 'delegated') return 'nurse_dispatched';
    if (dto.careModel === 'multi') return 'coordinating';
    return this.locationStepCode(dto);
  }

  /** Status code of the step that represents "the session is live". */
  private locationStepCode(dto: GenerateTemplateDto): string {
    if (dto.careModel === 'group') return 'session_open';
    switch (dto.location) {
      case 'video': return 'video_call_ready';
      case 'audio': return 'audio_call_ready';
      case 'async': return 'under_review';
      default: return 'in_progress'; // home, office, urgent/emergency
    }
  }

  /** Status code of the output step for a given output type. */
  private outputStepCode(outputType: OutputType): string {
    const map: Record<OutputType, string> = {
      none: 'completed',
      exam_report: 'exam_complete',
      lab_result: 'results_ready',
      prescription: 'prescription_issued',
      eye_prescription: 'eye_prescription_written',
      care_notes: 'care_notes_written',
      exercise_plan: 'treatment_plan_created',
      meal_plan: 'meal_plan_created',
    };
    return map[outputType] ?? 'completed';
  }

  private buildServiceConfig(dto: GenerateTemplateDto): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    // Recurrence config — always present
    const recurrence: Record<string, unknown> = {
      type: dto.recurrenceType,
      interval: dto.recurrenceInterval ?? 1,
      sessionCount: dto.sessionCount ?? null,
      slotDuration: dto.slotDuration ?? 60,
    };
    if (dto.recurrenceType === 'recurring') {
      recurrence.frequency = dto.recurrenceFrequency ?? 'weekly';
    }
    config.recurrence = recurrence;

    // Health Shop stock management — provider sells physical items
    if (dto.isHealthShop) {
      config.stock = {
        checkOnAcceptance: true,
        subtractOnCompletion: true,
      };
    }

    // Prescription gate — patient must have an active prescription to book
    if (dto.requiresPrescription) {
      config.preflight = {
        requires: ['db:prescription'],
      };
    }

    return config;
  }

  // ─── Name / slug / description helpers ────────────────────────────────────

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
      parts.push('with Sample');
    }

    const outputType = dto.outputType ?? 'none';
    if (outputType !== 'none') {
      const outputLabel: Record<string, string> = {
        exam_report: 'with Exam Report',
        lab_result: 'with Lab Results',
        prescription: 'with Prescription',
        eye_prescription: 'with Eye Prescription',
        care_notes: 'with Care Notes',
        exercise_plan: 'with Exercise Plan',
        meal_plan: 'with Meal Plan',
      };
      if (outputLabel[outputType]) parts.push(outputLabel[outputType]);
    }

    if (dto.careModel === 'delegated') parts.push('(Delegated)');
    if (dto.careModel === 'group') parts.push('(Group)');
    if (dto.careModel === 'multi') parts.push('(Multi-provider)');

    if (dto.urgency !== 'scheduled') {
      parts.push(`– ${dto.urgency.charAt(0).toUpperCase()}${dto.urgency.slice(1)}`);
    }

    if (dto.recurrenceType === 'recurring') {
      const freqLabel = dto.recurrenceFrequency
        ? `${dto.recurrenceFrequency.charAt(0).toUpperCase()}${dto.recurrenceFrequency.slice(1)}`
        : 'Recurring';
      parts.push(`– Recurring ${freqLabel}`);
    }

    if (dto.isHealthShop) parts.push('[Health Shop]');

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
      `Output: ${dto.outputType ?? 'none'}.`,
      `Recurrence: ${dto.recurrenceType}${dto.recurrenceFrequency ? ` (${dto.recurrenceFrequency})` : ''}.`,
    ];
    if (dto.requiresPrescription) parts.push('Requires prescription.');
    if (dto.isHealthShop) parts.push('Health Shop order.');
    return parts.join(' ');
  }
}
