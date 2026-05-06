import { WorkflowGeneratorService } from './workflow-generator.service';
import { GenerateTemplateDto } from './dto/generate-template.dto';

describe('WorkflowGeneratorService', () => {
  let service: WorkflowGeneratorService;

  beforeEach(() => {
    service = new WorkflowGeneratorService();
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function makeDto(overrides: Partial<GenerateTemplateDto> = {}): GenerateTemplateDto {
    const dto = new GenerateTemplateDto();
    dto.location = 'video';
    dto.sample = 'none';
    dto.careModel = 'single';
    dto.urgency = 'scheduled';
    dto.recurrenceType = 'once';
    dto.outputType = 'none';
    return Object.assign(dto, overrides);
  }

  function codes(result: ReturnType<typeof service.generate>): string[] {
    return result.steps.map((s) => s.statusCode);
  }

  function hasStep(result: ReturnType<typeof service.generate>, statusCode: string) {
    return result.steps.some((s) => s.statusCode === statusCode);
  }

  function getStep(result: ReturnType<typeof service.generate>, statusCode: string) {
    return result.steps.find((s) => s.statusCode === statusCode);
  }

  function hasTransition(result: ReturnType<typeof service.generate>, from: string, to: string) {
    return result.transitions.some((t) => t.from === from && t.to === to);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // A. SERVICE MODE DERIVATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('A — service mode derivation', () => {
    it('emergency urgency → emergency serviceMode (highest priority)', () => {
      expect(service.generate(makeDto({ location: 'home', urgency: 'emergency' })).serviceMode).toBe('emergency');
    });

    it('urgent urgency → urgent serviceMode', () => {
      expect(service.generate(makeDto({ location: 'home', urgency: 'urgent' })).serviceMode).toBe('urgent');
    });

    it('delegated careModel → delegated serviceMode (beats location)', () => {
      expect(service.generate(makeDto({ location: 'video', careModel: 'delegated' })).serviceMode).toBe('delegated');
    });

    it('multi careModel → multi serviceMode', () => {
      expect(service.generate(makeDto({ careModel: 'multi' })).serviceMode).toBe('multi');
    });

    it('group careModel → group serviceMode', () => {
      expect(service.generate(makeDto({ careModel: 'group' })).serviceMode).toBe('group');
    });

    it('video location → video serviceMode', () => {
      expect(service.generate(makeDto({ location: 'video' })).serviceMode).toBe('video');
    });

    it('audio location → audio serviceMode', () => {
      expect(service.generate(makeDto({ location: 'audio' })).serviceMode).toBe('audio');
    });

    it('home location → home serviceMode', () => {
      expect(service.generate(makeDto({ location: 'home' })).serviceMode).toBe('home');
    });

    it('office location → office serviceMode', () => {
      expect(service.generate(makeDto({ location: 'office' })).serviceMode).toBe('office');
    });

    it('async location → async serviceMode', () => {
      expect(service.generate(makeDto({ location: 'async' })).serviceMode).toBe('async');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B. PAYMENT TIMING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('B — payment timing', () => {
    it('office → ON_COMPLETION (pay after visit)', () => {
      expect(service.generate(makeDto({ location: 'office' })).paymentTiming).toBe('ON_COMPLETION');
    });

    it('async → ON_COMPLETION (pay after review)', () => {
      expect(service.generate(makeDto({ location: 'async' })).paymentTiming).toBe('ON_COMPLETION');
    });

    it('home → ON_ACCEPTANCE', () => {
      expect(service.generate(makeDto({ location: 'home' })).paymentTiming).toBe('ON_ACCEPTANCE');
    });

    it('video → ON_ACCEPTANCE', () => {
      expect(service.generate(makeDto({ location: 'video' })).paymentTiming).toBe('ON_ACCEPTANCE');
    });

    it('audio → ON_ACCEPTANCE', () => {
      expect(service.generate(makeDto({ location: 'audio' })).paymentTiming).toBe('ON_ACCEPTANCE');
    });

    it('emergency → ON_ACCEPTANCE', () => {
      expect(service.generate(makeDto({ location: 'home', urgency: 'emergency' })).paymentTiming).toBe('ON_ACCEPTANCE');
    });

    it('paymentTimingOverride ON_ACCEPTANCE overrides office default', () => {
      expect(service.generate(makeDto({ location: 'office', paymentTimingOverride: 'ON_ACCEPTANCE' })).paymentTiming).toBe('ON_ACCEPTANCE');
    });

    it('paymentTimingOverride ON_COMPLETION overrides video default', () => {
      expect(service.generate(makeDto({ location: 'video', paymentTimingOverride: 'ON_COMPLETION' })).paymentTiming).toBe('ON_COMPLETION');
    });

    it('paymentTimingOverride ON_COMPLETION overrides async default (both ON_COMPLETION, no change)', () => {
      expect(service.generate(makeDto({ location: 'async', paymentTimingOverride: 'ON_COMPLETION' })).paymentTiming).toBe('ON_COMPLETION');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C. LOCATION STEPS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C — location steps', () => {
    it('video → VIDEO_CALL_READY with triggers_video_call flag', () => {
      const result = service.generate(makeDto({ location: 'video' }));
      expect(hasStep(result, 'video_call_ready')).toBe(true);
      expect(getStep(result, 'video_call_ready')?.flags?.triggers_video_call).toBe(true);
    });

    it('audio → AUDIO_CALL_READY with triggers_audio_call flag', () => {
      const result = service.generate(makeDto({ location: 'audio' }));
      expect(hasStep(result, 'audio_call_ready')).toBe(true);
      expect(getStep(result, 'audio_call_ready')?.flags?.triggers_audio_call).toBe(true);
    });

    it('async → UNDER_REVIEW (no video/audio flags)', () => {
      const result = service.generate(makeDto({ location: 'async' }));
      expect(hasStep(result, 'under_review')).toBe(true);
      expect(getStep(result, 'under_review')?.flags?.triggers_video_call).toBeFalsy();
    });

    it('home → IN_PROGRESS with label "In Progress"', () => {
      const result = service.generate(makeDto({ location: 'home' }));
      expect(hasStep(result, 'in_progress')).toBe(true);
      expect(getStep(result, 'in_progress')?.label).toBe('In Progress');
    });

    it('office → IN_PROGRESS', () => {
      expect(hasStep(service.generate(makeDto({ location: 'office' })), 'in_progress')).toBe(true);
    });

    it('emergency → IN_PROGRESS with label "Emergency Response"', () => {
      const result = service.generate(makeDto({ location: 'home', urgency: 'emergency' }));
      expect(getStep(result, 'in_progress')?.label).toBe('Emergency Response');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D. URGENCY — CONFIRMED STEP
  // ═══════════════════════════════════════════════════════════════════════════

  describe('D — urgency and CONFIRMED step', () => {
    it('scheduled → CONFIRMED step present', () => {
      expect(hasStep(service.generate(makeDto({ location: 'home' })), 'confirmed')).toBe(true);
    });

    it('urgent → CONFIRMED step skipped', () => {
      expect(hasStep(service.generate(makeDto({ location: 'home', urgency: 'urgent' })), 'confirmed')).toBe(false);
    });

    it('emergency → CONFIRMED step skipped', () => {
      expect(hasStep(service.generate(makeDto({ location: 'home', urgency: 'emergency' })), 'confirmed')).toBe(false);
    });

    it('urgent → PENDING transitions directly to first active step', () => {
      const result = service.generate(makeDto({ location: 'home', urgency: 'urgent' }));
      const pendingStep = getStep(result, 'pending');
      const acceptAction = pendingStep?.actionsForProvider?.find(a => a.action === 'accept');
      expect(acceptAction?.targetStatus).toBe('in_progress');
    });

    it('emergency + delegated → PENDING transitions directly to nurse_dispatched', () => {
      const result = service.generate(makeDto({ location: 'home', urgency: 'emergency', careModel: 'delegated' }));
      const pendingStep = getStep(result, 'pending');
      const acceptAction = pendingStep?.actionsForProvider?.find(a => a.action === 'accept');
      expect(acceptAction?.targetStatus).toBe('nurse_dispatched');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E. DELEGATED CARE MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('E — delegated care model', () => {
    it('delegated → includes NURSE_DISPATCHED and NURSE_ARRIVED steps', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'delegated' }));
      expect(hasStep(result, 'nurse_dispatched')).toBe(true);
      expect(hasStep(result, 'nurse_arrived')).toBe(true);
    });

    it('delegated → CONFIRMED transitions to nurse_dispatched', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'delegated' }));
      const confirmedStep = getStep(result, 'confirmed');
      const startAction = confirmedStep?.actionsForProvider?.find(a => a.action === 'start');
      expect(startAction?.targetStatus).toBe('nurse_dispatched');
    });

    it('delegated → NURSE_ARRIVED transitions to in_progress for home location', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'delegated' }));
      const arrivedStep = getStep(result, 'nurse_arrived');
      const startAction = arrivedStep?.actionsForProvider?.find(a => a.action === 'start');
      expect(startAction?.targetStatus).toBe('in_progress');
    });

    it('delegated + urgent → no CONFIRMED, PENDING → nurse_dispatched', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'delegated', urgency: 'urgent' }));
      expect(hasStep(result, 'confirmed')).toBe(false);
      const acceptAction = getStep(result, 'pending')?.actionsForProvider?.find(a => a.action === 'accept');
      expect(acceptAction?.targetStatus).toBe('nurse_dispatched');
    });

    it('delegated → serviceMode is delegated regardless of location', () => {
      expect(service.generate(makeDto({ location: 'video', careModel: 'delegated' })).serviceMode).toBe('delegated');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F. GROUP CARE MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('F — group care model', () => {
    it('group → SESSION_OPEN step replaces location step', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'group' }));
      expect(hasStep(result, 'session_open')).toBe(true);
      expect(hasStep(result, 'in_progress')).toBe(false);
    });

    it('group + video → SESSION_OPEN has triggers_video_call flag', () => {
      const result = service.generate(makeDto({ location: 'video', careModel: 'group' }));
      expect(getStep(result, 'session_open')?.flags?.triggers_video_call).toBe(true);
    });

    it('group + audio → SESSION_OPEN has triggers_audio_call flag', () => {
      const result = service.generate(makeDto({ location: 'audio', careModel: 'group' }));
      expect(getStep(result, 'session_open')?.flags?.triggers_audio_call).toBe(true);
    });

    it('group + home → SESSION_OPEN has no call flags', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'group' }));
      const sessionOpen = getStep(result, 'session_open');
      expect(sessionOpen?.flags?.triggers_video_call).toBeFalsy();
      expect(sessionOpen?.flags?.triggers_audio_call).toBeFalsy();
    });

    it('group → CONFIRMED transitions to session_open', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'group' }));
      const startAction = getStep(result, 'confirmed')?.actionsForProvider?.find(a => a.action === 'start');
      expect(startAction?.targetStatus).toBe('session_open');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // G. MULTI CARE MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('G — multi-provider care model', () => {
    it('multi → includes COORDINATING step', () => {
      expect(hasStep(service.generate(makeDto({ careModel: 'multi' })), 'coordinating')).toBe(true);
    });

    it('multi + video → COORDINATING transitions to video_call_ready', () => {
      const result = service.generate(makeDto({ location: 'video', careModel: 'multi' }));
      const readyAction = getStep(result, 'coordinating')?.actionsForProvider?.find(a => a.action === 'ready');
      expect(readyAction?.targetStatus).toBe('video_call_ready');
    });

    it('multi + home → COORDINATING transitions to in_progress', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'multi' }));
      const readyAction = getStep(result, 'coordinating')?.actionsForProvider?.find(a => a.action === 'ready');
      expect(readyAction?.targetStatus).toBe('in_progress');
    });

    it('multi → no SESSION_OPEN (that is for group only)', () => {
      expect(hasStep(service.generate(makeDto({ careModel: 'multi' })), 'session_open')).toBe(false);
    });

    it('multi → CONFIRMED transitions to coordinating', () => {
      const result = service.generate(makeDto({ careModel: 'multi' }));
      const startAction = getStep(result, 'confirmed')?.actionsForProvider?.find(a => a.action === 'start');
      expect(startAction?.targetStatus).toBe('coordinating');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // H. SAMPLE COLLECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('H — sample collection', () => {
    it('sample none → no SAMPLE_COLLECTED or RESULTS_READY', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'none' }));
      expect(hasStep(result, 'sample_collected')).toBe(false);
      expect(hasStep(result, 'results_ready')).toBe(false);
    });

    it('sample home → SAMPLE_COLLECTED + RESULTS_READY present', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home' }));
      expect(hasStep(result, 'sample_collected')).toBe(true);
      expect(hasStep(result, 'results_ready')).toBe(true);
    });

    it('sample office → SAMPLE_COLLECTED present', () => {
      expect(hasStep(service.generate(makeDto({ location: 'office', sample: 'office' })), 'sample_collected')).toBe(true);
    });

    it('sample self_kit → SAMPLE_COLLECTED with label "Sample Kit Sent"', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'self_kit' }));
      expect(getStep(result, 'sample_collected')?.label).toBe('Sample Kit Sent');
    });

    it('sample home → RESULTS_READY has requires_content: lab_result flag', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home' }));
      expect(getStep(result, 'results_ready')?.flags?.requires_content).toBe('lab_result');
    });

    it('sample home → SAMPLE_COLLECTED transitions to results_ready', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home' }));
      expect(hasTransition(result, 'sample_collected', 'results_ready')).toBe(true);
    });

    it('sample home + no output → RESULTS_READY transitions to completed', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', outputType: 'none' }));
      expect(hasTransition(result, 'results_ready', 'completed')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // I. OUTPUT TYPES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('I — clinical output types', () => {
    it('outputType none → no output step added', () => {
      const result = service.generate(makeDto({ location: 'video', outputType: 'none' }));
      const stepCodes = codes(result);
      expect(stepCodes).not.toContain('exam_complete');
      expect(stepCodes).not.toContain('prescription_issued');
      expect(stepCodes).not.toContain('eye_prescription_written');
      expect(stepCodes).not.toContain('care_notes_written');
      expect(stepCodes).not.toContain('treatment_plan_created');
      expect(stepCodes).not.toContain('meal_plan_created');
    });

    it('outputType exam_report → EXAM_COMPLETE step with requires_content: report', () => {
      const result = service.generate(makeDto({ location: 'office', outputType: 'exam_report' }));
      expect(hasStep(result, 'exam_complete')).toBe(true);
      expect(getStep(result, 'exam_complete')?.flags?.requires_content).toBe('report');
    });

    it('outputType prescription → PRESCRIPTION_ISSUED step', () => {
      const result = service.generate(makeDto({ location: 'async', outputType: 'prescription' }));
      expect(hasStep(result, 'prescription_issued')).toBe(true);
    });

    it('outputType eye_prescription → EYE_PRESCRIPTION_WRITTEN with requires_content: eye_prescription', () => {
      const result = service.generate(makeDto({ location: 'office', outputType: 'eye_prescription' }));
      expect(hasStep(result, 'eye_prescription_written')).toBe(true);
      expect(getStep(result, 'eye_prescription_written')?.flags?.requires_content).toBe('eye_prescription');
    });

    it('outputType care_notes → CARE_NOTES_WRITTEN with requires_content: care_notes', () => {
      const result = service.generate(makeDto({ location: 'home', outputType: 'care_notes' }));
      expect(hasStep(result, 'care_notes_written')).toBe(true);
      expect(getStep(result, 'care_notes_written')?.flags?.requires_content).toBe('care_notes');
    });

    it('outputType exercise_plan → TREATMENT_PLAN_CREATED with requires_content: exercise_plan', () => {
      const result = service.generate(makeDto({ location: 'office', outputType: 'exercise_plan' }));
      expect(hasStep(result, 'treatment_plan_created')).toBe(true);
      expect(getStep(result, 'treatment_plan_created')?.flags?.requires_content).toBe('exercise_plan');
    });

    it('outputType meal_plan → MEAL_PLAN_CREATED with requires_content: meal_plan', () => {
      const result = service.generate(makeDto({ location: 'video', outputType: 'meal_plan' }));
      expect(hasStep(result, 'meal_plan_created')).toBe(true);
      expect(getStep(result, 'meal_plan_created')?.flags?.requires_content).toBe('meal_plan');
    });

    it('outputType lab_result + no sample → standalone RESULTS_READY step', () => {
      const result = service.generate(makeDto({ location: 'office', sample: 'none', outputType: 'lab_result' }));
      expect(hasStep(result, 'results_ready')).toBe(true);
      expect(hasStep(result, 'sample_collected')).toBe(false);
    });

    it('outputType lab_result + sample home → only one RESULTS_READY (not duplicated)', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', outputType: 'lab_result' }));
      const resultSteps = result.steps.filter(s => s.statusCode === 'results_ready');
      expect(resultSteps).toHaveLength(1);
      // SAMPLE_COLLECTED is still present
      expect(hasStep(result, 'sample_collected')).toBe(true);
    });

    it('async + outputType none → UNDER_REVIEW transitions directly to completed', () => {
      const result = service.generate(makeDto({ location: 'async', outputType: 'none' }));
      expect(hasStep(result, 'prescription_issued')).toBe(false);
      expect(hasTransition(result, 'under_review', 'completed')).toBe(true);
    });

    it('async + outputType prescription → UNDER_REVIEW → PRESCRIPTION_ISSUED → completed', () => {
      const result = service.generate(makeDto({ location: 'async', outputType: 'prescription' }));
      expect(hasTransition(result, 'under_review', 'prescription_issued')).toBe(true);
      expect(hasTransition(result, 'prescription_issued', 'completed')).toBe(true);
    });

    it('video + outputType exam_report → VIDEO_CALL_READY complete action → exam_complete', () => {
      const result = service.generate(makeDto({ location: 'video', outputType: 'exam_report' }));
      const completeAction = getStep(result, 'video_call_ready')?.actionsForProvider?.find(a => a.action === 'complete');
      expect(completeAction?.targetStatus).toBe('exam_complete');
    });

    it('home + outputType care_notes → IN_PROGRESS → care_notes_written', () => {
      const result = service.generate(makeDto({ location: 'home', outputType: 'care_notes' }));
      const completeAction = getStep(result, 'in_progress')?.actionsForProvider?.find(a => a.action === 'complete');
      expect(completeAction?.targetStatus).toBe('care_notes_written');
    });

    it('sample + outputType exam_report → RESULTS_READY transitions to exam_complete', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', outputType: 'exam_report' }));
      expect(hasTransition(result, 'results_ready', 'exam_complete')).toBe(true);
      expect(hasStep(result, 'exam_complete')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // J. SERVICE CONFIG — HEALTH SHOP & PRESCRIPTION GATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('J — serviceConfig: stock and preflight', () => {
    it('isHealthShop true → serviceConfig.stock present with both flags', () => {
      const result = service.generate(makeDto({ isHealthShop: true }));
      const stock = (result.serviceConfig as any).stock;
      expect(stock).toBeDefined();
      expect(stock.checkOnAcceptance).toBe(true);
      expect(stock.subtractOnCompletion).toBe(true);
    });

    it('isHealthShop false → no serviceConfig.stock', () => {
      const result = service.generate(makeDto({ isHealthShop: false }));
      expect((result.serviceConfig as any).stock).toBeUndefined();
    });

    it('isHealthShop undefined → no serviceConfig.stock', () => {
      const result = service.generate(makeDto());
      expect((result.serviceConfig as any).stock).toBeUndefined();
    });

    it('requiresPrescription true → serviceConfig.preflight.requires includes db:prescription', () => {
      const result = service.generate(makeDto({ requiresPrescription: true }));
      const requires = (result.serviceConfig as any).preflight?.requires as string[];
      expect(requires).toBeDefined();
      expect(requires).toContain('db:prescription');
    });

    it('requiresPrescription false → no serviceConfig.preflight', () => {
      const result = service.generate(makeDto({ requiresPrescription: false }));
      expect((result.serviceConfig as any).preflight).toBeUndefined();
    });

    it('requiresPrescription undefined → no serviceConfig.preflight', () => {
      const result = service.generate(makeDto());
      expect((result.serviceConfig as any).preflight).toBeUndefined();
    });

    it('isHealthShop + requiresPrescription → both configs present (prescription-only items)', () => {
      const result = service.generate(makeDto({ isHealthShop: true, requiresPrescription: true }));
      expect((result.serviceConfig as any).stock?.checkOnAcceptance).toBe(true);
      expect((result.serviceConfig as any).preflight?.requires).toContain('db:prescription');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // K. RECURRENCE CONFIG
  // ═══════════════════════════════════════════════════════════════════════════

  describe('K — recurrence serviceConfig', () => {
    it('once → serviceConfig.recurrence.type === "once"', () => {
      const result = service.generate(makeDto({ recurrenceType: 'once' }));
      expect((result.serviceConfig as any).recurrence.type).toBe('once');
    });

    it('recurring → serviceConfig.recurrence.type === "recurring" with frequency', () => {
      const result = service.generate(makeDto({ recurrenceType: 'recurring', recurrenceFrequency: 'weekly' }));
      const rec = (result.serviceConfig as any).recurrence;
      expect(rec.type).toBe('recurring');
      expect(rec.frequency).toBe('weekly');
    });

    it('recurring daily → frequency: daily', () => {
      const result = service.generate(makeDto({ recurrenceType: 'recurring', recurrenceFrequency: 'daily' }));
      expect((result.serviceConfig as any).recurrence.frequency).toBe('daily');
    });

    it('recurring monthly with 12 sessions → sessionCount: 12', () => {
      const result = service.generate(makeDto({
        recurrenceType: 'recurring', recurrenceFrequency: 'monthly', sessionCount: 12,
      }));
      expect((result.serviceConfig as any).recurrence.sessionCount).toBe(12);
    });

    it('slotDuration 45 → stored in serviceConfig.recurrence', () => {
      const result = service.generate(makeDto({ recurrenceType: 'recurring', slotDuration: 45 }));
      expect((result.serviceConfig as any).recurrence.slotDuration).toBe(45);
    });

    it('slotDuration defaults to 60 when not provided', () => {
      const result = service.generate(makeDto());
      expect((result.serviceConfig as any).recurrence.slotDuration).toBe(60);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // L. STEP ORDERING & TERMINAL STEPS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('L — step ordering and terminal steps', () => {
    it.each([
      makeDto(),
      makeDto({ location: 'home', sample: 'home' }),
      makeDto({ location: 'audio' }),
      makeDto({ location: 'async' }),
      makeDto({ location: 'home', careModel: 'delegated' }),
      makeDto({ location: 'home', urgency: 'urgent' }),
      makeDto({ location: 'home', urgency: 'emergency' }),
      makeDto({ location: 'office', sample: 'office' }),
      makeDto({ location: 'home', careModel: 'group' }),
      makeDto({ location: 'video', careModel: 'multi' }),
      makeDto({ location: 'home', outputType: 'care_notes' }),
      makeDto({ location: 'async', outputType: 'prescription' }),
      makeDto({ isHealthShop: true }),
    ])('starts with pending, ends with completed then cancelled', (dto) => {
      const result = service.generate(dto);
      const stepCodes = codes(result);
      expect(stepCodes[0]).toBe('pending');
      expect(stepCodes[stepCodes.length - 1]).toBe('cancelled');
      expect(stepCodes[stepCodes.length - 2]).toBe('completed');
    });

    it('steps are numbered sequentially from 1', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', careModel: 'delegated', outputType: 'care_notes' }));
      result.steps.forEach((step, i) => {
        expect(step.order).toBe(i + 1);
      });
    });

    it('delegated home visit has correct step order: pending → confirmed → dispatched → arrived → in_progress → completed → cancelled', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'delegated' }));
      const stepCodes = codes(result);
      expect(stepCodes).toEqual(['pending', 'confirmed', 'nurse_dispatched', 'nurse_arrived', 'in_progress', 'completed', 'cancelled']);
    });

    it('video + exam_report has correct step order', () => {
      const result = service.generate(makeDto({ location: 'video', outputType: 'exam_report' }));
      const stepCodes = codes(result);
      expect(stepCodes).toEqual(['pending', 'confirmed', 'video_call_ready', 'exam_complete', 'completed', 'cancelled']);
    });

    it('home + sample + care_notes has correct step order', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', outputType: 'care_notes' }));
      const stepCodes = codes(result);
      expect(stepCodes).toEqual(['pending', 'confirmed', 'in_progress', 'sample_collected', 'results_ready', 'care_notes_written', 'completed', 'cancelled']);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // M. TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('M — transitions', () => {
    it('every non-terminal step has at least one forward transition', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', outputType: 'exam_report' }));
      const nonTerminal = result.steps.filter(s => !['completed', 'cancelled'].includes(s.statusCode));
      for (const step of nonTerminal) {
        const hasForward = result.transitions.some(t => t.from === step.statusCode && t.to !== 'cancelled');
        expect(hasForward).toBe(true);
      }
    });

    it('every non-terminal step has a cancel → cancelled transition', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home' }));
      const nonTerminal = result.steps.filter(s => !['completed', 'cancelled'].includes(s.statusCode));
      for (const step of nonTerminal) {
        expect(result.transitions.some(t => t.from === step.statusCode && t.to === 'cancelled')).toBe(true);
      }
    });

    it('provider actions produce provider-role transitions', () => {
      const result = service.generate(makeDto({ location: 'home' }));
      const acceptTrans = result.transitions.find(t => t.from === 'pending' && t.action === 'accept');
      expect(acceptTrans?.allowedRoles).toContain('provider');
    });

    it('patient actions produce patient-role transitions', () => {
      const result = service.generate(makeDto({ location: 'home' }));
      const cancelTrans = result.transitions.find(t => t.from === 'pending' && t.action === 'cancel');
      expect(cancelTrans?.allowedRoles).toContain('patient');
    });

    it('no duplicate transitions (same from/to/action)', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', careModel: 'delegated' }));
      const seen = new Set<string>();
      for (const t of result.transitions) {
        const key = `${t.from}:${t.to}:${t.action}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });

    it('completed and cancelled steps have no outgoing transitions', () => {
      const result = service.generate(makeDto({ location: 'home' }));
      const fromCompleted = result.transitions.filter(t => t.from === 'completed');
      const fromCancelled = result.transitions.filter(t => t.from === 'cancelled');
      expect(fromCompleted).toHaveLength(0);
      expect(fromCancelled).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // N. NAME, SLUG, DESCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('N — name, slug, description', () => {
    it('video location → name contains "Video"', () => {
      expect(service.generate(makeDto({ location: 'video' })).name.toLowerCase()).toContain('video');
    });

    it('home location → name contains "Home"', () => {
      expect(service.generate(makeDto({ location: 'home' })).name.toLowerCase()).toContain('home');
    });

    it('sample present → name contains "Sample"', () => {
      expect(service.generate(makeDto({ location: 'home', sample: 'home' })).name).toContain('Sample');
    });

    it('outputType exam_report → name contains "Exam Report"', () => {
      expect(service.generate(makeDto({ location: 'office', outputType: 'exam_report' })).name).toContain('Exam Report');
    });

    it('outputType care_notes → name contains "Care Notes"', () => {
      expect(service.generate(makeDto({ location: 'home', outputType: 'care_notes' })).name).toContain('Care Notes');
    });

    it('delegated → name contains "Delegated"', () => {
      expect(service.generate(makeDto({ location: 'home', careModel: 'delegated' })).name).toContain('Delegated');
    });

    it('group → name contains "Group"', () => {
      expect(service.generate(makeDto({ location: 'home', careModel: 'group' })).name).toContain('Group');
    });

    it('multi → name contains "Multi-provider"', () => {
      expect(service.generate(makeDto({ careModel: 'multi' })).name).toContain('Multi-provider');
    });

    it('urgent → name contains "Urgent"', () => {
      expect(service.generate(makeDto({ location: 'home', urgency: 'urgent' })).name).toContain('Urgent');
    });

    it('recurring → name contains "Recurring"', () => {
      expect(service.generate(makeDto({ location: 'home', recurrenceType: 'recurring', recurrenceFrequency: 'weekly' })).name.toLowerCase()).toContain('recurring');
    });

    it('isHealthShop → name contains "Health Shop"', () => {
      expect(service.generate(makeDto({ isHealthShop: true })).name).toContain('Health Shop');
    });

    it('custom name → overrides auto-generated name', () => {
      expect(service.generate(makeDto({ name: 'My Custom Workflow' })).name).toBe('My Custom Workflow');
    });

    it('two calls with same dto produce different slugs (random suffix)', () => {
      const dto = makeDto();
      expect(service.generate(dto).slug).not.toBe(service.generate(dto).slug);
    });

    it('slug only contains lowercase letters, numbers and hyphens', () => {
      const result = service.generate(makeDto({ location: 'home', urgency: 'urgent', careModel: 'delegated' }));
      expect(result.slug).toMatch(/^[a-z0-9-]+$/);
    });

    it('suggestedAxes echoes back all 6 axes', () => {
      const dto = makeDto({ location: 'home', sample: 'self_kit', careModel: 'group', urgency: 'scheduled', recurrenceType: 'once', outputType: 'care_notes' });
      const result = service.generate(dto);
      expect(result.suggestedAxes.location).toBe('home');
      expect(result.suggestedAxes.sample).toBe('self_kit');
      expect(result.suggestedAxes.careModel).toBe('group');
      expect(result.suggestedAxes.urgency).toBe('scheduled');
      expect(result.suggestedAxes.recurrenceType).toBe('once');
      expect(result.suggestedAxes.outputType).toBe('care_notes');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // O. COMPLEX / REAL-WORLD COMBINATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('O — real-world scenario combinations', () => {
    it('optometrist: office + eye_prescription → OFFICE IN_PROGRESS → EYE_PRESCRIPTION_WRITTEN → COMPLETED', () => {
      const result = service.generate(makeDto({ location: 'office', outputType: 'eye_prescription' }));
      const stepCodes = codes(result);
      expect(stepCodes).toContain('eye_prescription_written');
      expect(stepCodes.indexOf('in_progress')).toBeLessThan(stepCodes.indexOf('eye_prescription_written'));
    });

    it('physiotherapy: office + exercise_plan + recurring weekly → TREATMENT_PLAN_CREATED in steps', () => {
      const result = service.generate(makeDto({
        location: 'office', outputType: 'exercise_plan',
        recurrenceType: 'recurring', recurrenceFrequency: 'weekly',
      }));
      expect(hasStep(result, 'treatment_plan_created')).toBe(true);
      expect((result.serviceConfig as any).recurrence.frequency).toBe('weekly');
    });

    it('lab test: home + sample + lab_result output type → single RESULTS_READY not duplicated', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'home', outputType: 'lab_result' }));
      expect(result.steps.filter(s => s.statusCode === 'results_ready')).toHaveLength(1);
    });

    it('async prescription renewal: async + prescription + requiresPrescription gate', () => {
      const result = service.generate(makeDto({ location: 'async', outputType: 'prescription', requiresPrescription: true }));
      expect(hasStep(result, 'prescription_issued')).toBe(true);
      expect((result.serviceConfig as any).preflight?.requires).toContain('db:prescription');
    });

    it('health shop pharmacy order: home + isHealthShop + requiresPrescription', () => {
      const result = service.generate(makeDto({ location: 'home', isHealthShop: true, requiresPrescription: true }));
      expect((result.serviceConfig as any).stock?.checkOnAcceptance).toBe(true);
      expect((result.serviceConfig as any).preflight?.requires).toContain('db:prescription');
    });

    it('emergency dispatch: emergency + delegated + no confirmed', () => {
      const result = service.generate(makeDto({ location: 'home', urgency: 'emergency', careModel: 'delegated' }));
      expect(hasStep(result, 'confirmed')).toBe(false);
      expect(hasStep(result, 'nurse_dispatched')).toBe(true);
      expect(result.serviceMode).toBe('emergency');
    });

    it('nutritionist: video + meal_plan + recurring monthly', () => {
      const result = service.generate(makeDto({
        location: 'video', outputType: 'meal_plan',
        recurrenceType: 'recurring', recurrenceFrequency: 'monthly',
      }));
      expect(hasStep(result, 'meal_plan_created')).toBe(true);
      expect(result.serviceMode).toBe('video');
    });

    it('nurse home visit: home + delegated + care_notes → nurse workflow', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'delegated', outputType: 'care_notes' }));
      const stepCodes = codes(result);
      expect(stepCodes).toContain('nurse_dispatched');
      expect(stepCodes).toContain('nurse_arrived');
      expect(stepCodes).toContain('in_progress');
      expect(stepCodes).toContain('care_notes_written');
    });

    it('multi-provider home visit: multi + home + exercise_plan', () => {
      const result = service.generate(makeDto({ location: 'home', careModel: 'multi', outputType: 'exercise_plan' }));
      expect(hasStep(result, 'coordinating')).toBe(true);
      expect(hasStep(result, 'in_progress')).toBe(true);
      expect(hasStep(result, 'treatment_plan_created')).toBe(true);
    });

    it('video group therapy: group + video + care_notes', () => {
      const result = service.generate(makeDto({ location: 'video', careModel: 'group', outputType: 'care_notes' }));
      expect(hasStep(result, 'session_open')).toBe(true);
      expect(getStep(result, 'session_open')?.flags?.triggers_video_call).toBe(true);
      expect(hasStep(result, 'care_notes_written')).toBe(true);
    });

    it('dentist office exam with report: office + exam_report + ON_COMPLETION payment', () => {
      const result = service.generate(makeDto({ location: 'office', outputType: 'exam_report' }));
      expect(result.paymentTiming).toBe('ON_COMPLETION');
      expect(hasStep(result, 'exam_complete')).toBe(true);
    });

    it('lab test with self-collection kit: home + self_kit + lab_result (sample handles it)', () => {
      const result = service.generate(makeDto({ location: 'home', sample: 'self_kit', outputType: 'lab_result' }));
      expect(getStep(result, 'sample_collected')?.label).toBe('Sample Kit Sent');
      expect(result.steps.filter(s => s.statusCode === 'results_ready')).toHaveLength(1);
    });
  });
});
