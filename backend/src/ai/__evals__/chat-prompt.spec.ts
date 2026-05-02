/**
 * Eval spec for the chat prompt builder. Uses `AiService.buildSystemPrompt`
 * to assert that the prompt honours profile data, respects allergies,
 * carries the safety block, and switches correctly between provider +
 * member tiers.
 *
 * This is NOT a live LLM eval — it asserts the STRUCTURE + CONTENT of the
 * prompt that gets sent to Groq. The LLM-response eval (which would need
 * an actual API call) lives separately and only runs in staging.
 */
import { AiService } from '../ai.service';

// Minimal stub — we don't hit Prisma in these unit evals.
const prismaStub = {} as any;
const service = new AiService(prismaStub);

const baseIdentity = {
  userId: 'U1', firstName: 'Marie', lastName: 'Dupont',
  userType: 'MEMBER', language: 'en', regionCode: 'MU',
};

describe('chat prompt — profile personalisation', () => {
  it("includes the user's first name", () => {
    const ctx = { identity: baseIdentity };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).toContain('Marie');
  });

  it('injects admin-supplied condition guidance when passed in', () => {
    // Knowledge is now DB-backed — callers resolve it via ClinicalKnowledgeService
    // and pass the pre-resolved lines into buildSystemPrompt.
    const ctx = {
      identity: baseIdentity,
      health: {
        allergies: [], chronicConditions: ['Type 2 diabetes'],
        recentDiagnoses: [], activeMedications: [],
        dietaryPreferences: [], allergenSettings: [],
      },
    };
    const p = service.buildSystemPrompt(ctx as any, '', '', [
      'Diabetes: low-GI foods, limit added sugars.',
    ]);
    expect(p).toContain('Type 2 diabetes');
    expect(p).toMatch(/low-GI foods/);
    expect(p).toMatch(/CONDITION-SPECIFIC DIETARY GUIDANCE/);
  });

  it('omits the condition-guidance section when no lines resolved', () => {
    const ctx = {
      identity: baseIdentity,
      health: {
        allergies: [], chronicConditions: [],
        recentDiagnoses: [], activeMedications: [],
        dietaryPreferences: [], allergenSettings: [],
      },
    };
    const p = service.buildSystemPrompt(ctx as any, '', '', []);
    expect(p).not.toContain('CONDITION-SPECIFIC DIETARY GUIDANCE');
  });

  it('surfaces allergies as CRITICAL', () => {
    const ctx = {
      identity: baseIdentity,
      health: {
        allergies: ['peanuts'], chronicConditions: [],
        recentDiagnoses: [], activeMedications: [],
        dietaryPreferences: [], allergenSettings: [],
      },
    };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).toMatch(/CRITICAL/);
    expect(p).toContain('peanuts');
  });

  it('includes BMI + weight goal when present', () => {
    const ctx = {
      identity: baseIdentity,
      health: {
        allergies: [], chronicConditions: [], recentDiagnoses: [],
        activeMedications: [], dietaryPreferences: [], allergenSettings: [],
        heightCm: 170, weightKg: 75, bmi: 26, weightGoal: 'lose', activityLevel: 'moderately_active',
      },
    };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).toMatch(/170cm.*75kg.*BMI 26/);
    expect(p).toMatch(/lose/);
  });

  it('prompts in the user\'s preferred language', () => {
    const ctx = { identity: { ...baseIdentity, language: 'fr' } };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).toMatch(/preferred language.*fr/i);
  });

  it('emits a provider-tier prompt for users with a provider slice', () => {
    const ctx = {
      identity: { ...baseIdentity, firstName: 'Dr Smith', userType: 'DOCTOR' },
      provider: {
        specialty: ['Cardiology'],
        bio: 'Cardiac specialist.',
        experience: '15 years',
      },
    };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).toMatch(/PROVIDER PROFILE/);
    expect(p).toMatch(/qualified clinician/i);
    expect(p).toContain('Cardiology');
  });

  it('member-tier prompt keeps the safety block', () => {
    const ctx = { identity: baseIdentity };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).toMatch(/NEVER diagnose/i);
    expect(p).toMatch(/consult.*doctor/i);
  });

  it('does NOT expose the member safety block in provider-tier', () => {
    // Provider-tier intentionally skips "consult your doctor" — they ARE the doctor.
    const ctx = {
      identity: { ...baseIdentity, userType: 'DOCTOR' },
      provider: { specialty: ['General Practice'], experience: '5 years' },
    };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).toMatch(/Skip the usual "consult a doctor"/i);
  });
});

describe('chat prompt — budget + formatting', () => {
  it('stays under the 4KB soft budget for a rich profile', () => {
    const ctx = {
      identity: baseIdentity,
      health: {
        bloodType: 'O+', healthScore: 82,
        allergies: ['peanuts', 'shellfish'],
        chronicConditions: ['Type 2 diabetes', 'Hypertension'],
        recentDiagnoses: ['URI', 'Viral gastroenteritis'],
        activeMedications: ['Metformin 500mg BID', 'Amlodipine 5mg'],
        dietaryPreferences: ['Vegetarian'], allergenSettings: ['Nuts'],
        heightCm: 165, weightKg: 70, bmi: 25.7,
        weightGoal: 'maintain', activityLevel: 'moderately_active',
        targetCalories: 2000, targetWaterMl: 2000, targetExerciseMin: 30, targetSleepMin: 480,
      },
    };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p.length).toBeLessThan(4096);
  });

  it('never leaves empty "undefined" placeholders when optional fields are missing', () => {
    const ctx = { identity: baseIdentity };
    const p = service.buildSystemPrompt(ctx as any, '', '');
    expect(p).not.toMatch(/undefined/);
    expect(p).not.toMatch(/\bnull\b/);
  });
});
