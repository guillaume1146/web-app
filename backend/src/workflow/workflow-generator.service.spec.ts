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
    return Object.assign(dto, overrides);
  }

  function stepCodes(result: ReturnType<typeof service.generate>): string[] {
    return result.steps.map((s) => s.statusCode);
  }

  // ─── Test 1: Video + once + no sample + single + scheduled ───────────────

  it('should produce a video template with VIDEO_CALL_READY and no sample steps', () => {
    const result = service.generate(makeDto());

    expect(result.serviceMode).toBe('video');
    expect(result.paymentTiming).toBe('ON_ACCEPTANCE');

    const codes = stepCodes(result);
    expect(codes).toContain('video_call_ready');
    expect(codes).not.toContain('sample_collected');
    expect(codes).not.toContain('results_ready');
  });

  // ─── Test 2: Home + recurring + home sample + single + scheduled ──────────

  it('should produce a home template with sample steps and recurring serviceConfig', () => {
    const result = service.generate(
      makeDto({
        location: 'home',
        sample: 'home',
        recurrenceType: 'recurring',
        recurrenceFrequency: 'weekly',
      }),
    );

    expect(result.serviceMode).toBe('home');

    const codes = stepCodes(result);
    expect(codes).toContain('sample_collected');
    expect(codes).toContain('results_ready');

    const recurrence = (result.serviceConfig as any).recurrence;
    expect(recurrence.type).toBe('recurring');
    expect(recurrence.frequency).toBe('weekly');
  });

  // ─── Test 3: Audio + once + no sample + single + scheduled ───────────────

  it('should produce an audio template with AUDIO_CALL_READY', () => {
    const result = service.generate(makeDto({ location: 'audio' }));

    expect(result.serviceMode).toBe('audio');

    const codes = stepCodes(result);
    expect(codes).toContain('audio_call_ready');
    expect(codes).not.toContain('video_call_ready');
  });

  // ─── Test 4: Async + once + no sample + single + scheduled ───────────────

  it('should produce an async template with UNDER_REVIEW and ON_COMPLETION payment', () => {
    const result = service.generate(makeDto({ location: 'async' }));

    expect(result.serviceMode).toBe('async');
    expect(result.paymentTiming).toBe('ON_COMPLETION');

    const codes = stepCodes(result);
    expect(codes).toContain('under_review');
    // async also inserts a prescription_issued step
    expect(codes).toContain('prescription_issued');
  });

  // ─── Test 5: Home + once + no sample + delegated + scheduled ─────────────

  it('should produce a delegated template with NURSE_DISPATCHED and NURSE_ARRIVED', () => {
    const result = service.generate(makeDto({ location: 'home', careModel: 'delegated' }));

    expect(result.serviceMode).toBe('delegated');

    const codes = stepCodes(result);
    expect(codes).toContain('nurse_dispatched');
    expect(codes).toContain('nurse_arrived');
  });

  // ─── Test 6: Urgent — no CONFIRMED step ──────────────────────────────────

  it('should skip CONFIRMED step when urgency is urgent', () => {
    const result = service.generate(makeDto({ location: 'home', urgency: 'urgent' }));

    expect(result.serviceMode).toBe('urgent');

    const codes = stepCodes(result);
    expect(codes).not.toContain('confirmed');
    expect(codes).toContain('in_progress');
  });

  // ─── Test 7: Every template has PENDING first and COMPLETED+CANCELLED last

  it.each([
    makeDto(),
    makeDto({ location: 'home', sample: 'home', recurrenceType: 'recurring' }),
    makeDto({ location: 'audio' }),
    makeDto({ location: 'async' }),
    makeDto({ location: 'home', careModel: 'delegated' }),
    makeDto({ location: 'home', urgency: 'urgent' }),
    makeDto({ location: 'home', urgency: 'emergency' }),
    makeDto({ location: 'office', sample: 'office' }),
  ])('every template starts with PENDING and ends with COMPLETED, CANCELLED', (dto) => {
    const result = service.generate(dto);
    const codes = stepCodes(result);

    expect(codes[0]).toBe('pending');
    expect(codes[codes.length - 1]).toBe('cancelled');
    expect(codes[codes.length - 2]).toBe('completed');
  });

  // ─── Test 8: Transitions — every non-terminal status is reachable ─────────

  it('should generate transitions so every non-terminal status has a forward path', () => {
    const result = service.generate(makeDto({ location: 'home', sample: 'home' }));

    const nonTerminalCodes = result.steps
      .filter((s) => !['completed', 'cancelled'].includes(s.statusCode))
      .map((s) => s.statusCode);

    for (const code of nonTerminalCodes) {
      const hasForward = result.transitions.some(
        (t) => t.from === code && t.to !== 'cancelled',
      );
      expect(hasForward).toBe(true);
    }
  });

  it('should include cancel transitions to cancelled from every non-terminal step', () => {
    const result = service.generate(makeDto({ location: 'home', sample: 'home' }));

    const nonTerminalCodes = result.steps
      .filter((s) => !['completed', 'cancelled'].includes(s.statusCode))
      .map((s) => s.statusCode);

    for (const code of nonTerminalCodes) {
      const hasCancelTransition = result.transitions.some(
        (t) => t.from === code && t.to === 'cancelled',
      );
      expect(hasCancelTransition).toBe(true);
    }
  });

  // ─── Test 9: Slug uniqueness ──────────────────────────────────────────────

  it('should produce different slugs on two calls with the same dto', () => {
    const dto = makeDto();
    const r1 = service.generate(dto);
    const r2 = service.generate(dto);
    expect(r1.slug).not.toBe(r2.slug);
  });

  // ─── Test 10: Name generation ─────────────────────────────────────────────

  it('should include "Video" in the name for video location', () => {
    const result = service.generate(makeDto({ location: 'video' }));
    expect(result.name.toLowerCase()).toContain('video');
  });

  it('should include "Recurring" in the name when recurrenceType is recurring', () => {
    const result = service.generate(
      makeDto({ location: 'home', recurrenceType: 'recurring', recurrenceFrequency: 'weekly' }),
    );
    expect(result.name.toLowerCase()).toContain('recurring');
  });

  // ─── Additional edge cases ────────────────────────────────────────────────

  it('should set paymentTiming to ON_COMPLETION for office location', () => {
    const result = service.generate(makeDto({ location: 'office' }));
    expect(result.paymentTiming).toBe('ON_COMPLETION');
  });

  it('should echo back suggestedAxes with all 5 axes', () => {
    const dto = makeDto({ location: 'home', sample: 'self_kit', careModel: 'group', urgency: 'scheduled', recurrenceType: 'once' });
    const result = service.generate(dto);

    expect(result.suggestedAxes.location).toBe('home');
    expect(result.suggestedAxes.sample).toBe('self_kit');
    expect(result.suggestedAxes.careModel).toBe('group');
    expect(result.suggestedAxes.urgency).toBe('scheduled');
    expect(result.suggestedAxes.recurrenceType).toBe('once');
  });

  it('should include SAMPLE_COLLECTED with label "Sample Kit Sent" for self_kit sample type', () => {
    const result = service.generate(makeDto({ location: 'home', sample: 'self_kit' }));
    const sampleStep = result.steps.find((s) => s.statusCode === 'sample_collected');
    expect(sampleStep).toBeDefined();
    expect(sampleStep?.label).toBe('Sample Kit Sent');
  });

  it('should use emergency serviceMode when urgency is emergency', () => {
    const result = service.generate(makeDto({ location: 'home', urgency: 'emergency' }));
    expect(result.serviceMode).toBe('emergency');
  });

  it('should skip CONFIRMED step when urgency is emergency', () => {
    const result = service.generate(makeDto({ location: 'home', urgency: 'emergency' }));
    const codes = stepCodes(result);
    expect(codes).not.toContain('confirmed');
  });

  it('should include slotDuration and sessionCount in serviceConfig.recurrence', () => {
    const result = service.generate(
      makeDto({ recurrenceType: 'recurring', recurrenceFrequency: 'monthly', slotDuration: 45, sessionCount: 12 }),
    );
    const recurrence = (result.serviceConfig as any).recurrence;
    expect(recurrence.slotDuration).toBe(45);
    expect(recurrence.sessionCount).toBe(12);
  });

  it('should use provided name if given', () => {
    const result = service.generate(makeDto({ name: 'My Custom Name' }));
    expect(result.name).toBe('My Custom Name');
  });

  it('should have steps with incrementing order starting from 1', () => {
    const result = service.generate(makeDto({ location: 'home', sample: 'home', careModel: 'delegated' }));
    result.steps.forEach((step, i) => {
      expect(step.order).toBe(i + 1);
    });
  });
});
