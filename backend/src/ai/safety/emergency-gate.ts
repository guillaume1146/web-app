/**
 * Pre-LLM emergency keyword gate. Matches red-flag terms in user messages
 * BEFORE hitting Groq, then short-circuits with a canned emergency
 * response + the region's emergency number. The LLM can never be trusted
 * to recognise every emergency reliably; this layer is defence in depth.
 *
 * Keyword lists cover English + French + Mauritian Creole (the three
 * languages MediWyz serves). Not exhaustive — designed to catch the
 * clearest cases. False positives are acceptable; false negatives are not.
 */

export interface EmergencyMatch {
  matched: true;
  category: 'cardiac' | 'stroke' | 'bleeding' | 'suicide' | 'obstetric' | 'respiratory' | 'overdose' | 'anaphylaxis';
  triggered: string;
}
export type EmergencyCheckResult = EmergencyMatch | { matched: false };

// Region → local emergency number. Fallback to generic "emergency services".
const EMERGENCY_NUMBERS: Record<string, string> = {
  MU: '114',  // Mauritius SAMU
  MG: '124',  // Madagascar
  KE: '999',  // Kenya
  TG: '8200', // Togo medical
  BJ: '117',  // Benin
  RW: '912',  // Rwanda
};

// Patterns per category. Case-insensitive, whole-word-ish. French + MFE variants included.
const PATTERNS: Array<{ category: EmergencyMatch['category']; pattern: RegExp; triggerLabel: string }> = [
  // ── Cardiac ──────────────────────────────────────────────────────────
  { category: 'cardiac', pattern: /\b(chest\s*pain|heart\s*attack|crushing\s*pressure|tight\s*chest|douleur\s*(au\s*)?thorac\w*|crise\s*cardiaque|douler\s*lestomak)\b/i, triggerLabel: 'chest pain / heart attack' },
  // ── Stroke ───────────────────────────────────────────────────────────
  { category: 'stroke', pattern: /\b(stroke|slurred\s*speech|one\s*side\s*(of\s*(my|the))?\s*face|can'?t\s*move\s*(my\s*)?(arm|leg|side)|avc|attaque\s*cerebrale|bouche\s*tordue)\b/i, triggerLabel: 'stroke symptoms' },
  // ── Severe bleeding ─────────────────────────────────────────────────
  { category: 'bleeding', pattern: /\b(bleeding\s*(badly|heavily|won'?t\s*stop)|hemorrhag\w*|h[ée]morragie|saignement\s*abondant|dilo\s*koule\s*gro)\b/i, triggerLabel: 'severe bleeding' },
  // ── Suicide / self-harm ─────────────────────────────────────────────
  { category: 'suicide', pattern: /\b(kill\s*myself|end\s*my\s*life|suicide|suicidal|harm\s*myself|self\s*harm|me\s*suicider|finir\s*(avec\s*)?ma\s*vie|met\s*final\s*a\s*mo\s*lavi)\b/i, triggerLabel: 'suicidal thoughts' },
  // ── Obstetric emergency ─────────────────────────────────────────────
  { category: 'obstetric', pattern: /\b((heavy|severe)\s*bleeding\s*(during|in)\s*pregnan\w*|miscarr(iage|y)|eclampsia|water\s*broke|contractions?\s*(every\s*)?[0-9]\s*min|fausse\s*couche|eclampsie)\b/i, triggerLabel: 'pregnancy emergency' },
  // ── Respiratory ─────────────────────────────────────────────────────
  { category: 'respiratory', pattern: /\b(can'?t\s*breathe|trouble\s*breathing|choking|gasping|je\s*peux\s*pas\s*respirer|je\s*m'?etouffe|mo\s*pa\s*kapav\s*respire)\b/i, triggerLabel: 'breathing difficulty' },
  // ── Overdose ────────────────────────────────────────────────────────
  { category: 'overdose', pattern: /\b(overdose|took\s*too\s*many\s*pills|poisoned|surdose|avale\s*trop\s*de\s*(comprim\w*|medicament\w*))\b/i, triggerLabel: 'overdose' },
  // ── Anaphylaxis ─────────────────────────────────────────────────────
  { category: 'anaphylaxis', pattern: /\b(anaphyla\w*|throat\s*swelling|face\s*swelling|can'?t\s*swallow|tongue\s*swell|gorge\s*qui\s*gonfle|visage\s*gonfle)\b/i, triggerLabel: 'anaphylaxis' },
];

export function checkEmergency(userMessage: string): EmergencyCheckResult {
  if (!userMessage) return { matched: false };
  for (const { category, pattern, triggerLabel } of PATTERNS) {
    if (pattern.test(userMessage)) {
      return { matched: true, category, triggered: triggerLabel };
    }
  }
  return { matched: false };
}

/**
 * Build the canned emergency response. Region-aware number, category-aware
 * additional guidance. Short and actionable.
 */
export function buildEmergencyResponse(category: EmergencyMatch['category'], regionCode?: string, userFirstName?: string): string {
  const number = regionCode && EMERGENCY_NUMBERS[regionCode]
    ? EMERGENCY_NUMBERS[regionCode]
    : 'your local emergency services';
  const name = userFirstName ? `${userFirstName}, ` : '';

  const categoryGuidance: Record<EmergencyMatch['category'], string> = {
    cardiac: 'Sit or lie down, loosen tight clothing, chew an aspirin if you have one and are not allergic. Do NOT drive yourself.',
    stroke: 'Note the TIME you first noticed symptoms — doctors need this. Do not eat or drink. Someone else should drive or call the ambulance.',
    bleeding: 'Apply firm pressure with a clean cloth. Elevate the bleeding part above your heart if possible. Don\'t remove soaked cloths — add more on top.',
    suicide: 'You are not alone. Please stay with someone you trust while you wait. If you are in Mauritius, call Befrienders on 800-9393. Otherwise stay on the line with emergency services.',
    obstetric: 'Lie down on your left side. Keep a record of contractions or bleeding volume. Bring your prenatal records to the hospital.',
    respiratory: 'Sit up, stay calm, loosen tight clothing. If you have a rescue inhaler, use it. Don\'t lie flat.',
    overdose: 'Do not try to make them vomit. Keep the medication packaging to show the doctor. Stay with them; monitor breathing.',
    anaphylaxis: 'If you have an epinephrine auto-injector (EpiPen), use it NOW in the outer thigh. Then call emergency services — even after using the pen.',
  };

  return `🚨 **This sounds like an emergency. Call ${number} right now.**

${name}based on what you described (${categoryGuidance[category] ? categoryGuidance[category].split('.')[0].toLowerCase() : 'your symptoms'}), don't wait for my advice — please call emergency services **immediately**.

**While you wait:**
${categoryGuidance[category]}

I'm pausing our normal conversation until you tell me you're safe. If you're NOT experiencing an emergency and wrote this by accident, reply "false alarm" and we'll continue.`;
}
