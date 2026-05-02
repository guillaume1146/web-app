/**
 * Post-LLM safety layer. After Groq responds with dietary / supplement
 * advice, scan the output for mentions of foods that match allergies the
 * user has declared (`health.allergies` or `health.allergenSettings`).
 * If any slip through, prepend a warning banner so the user is alerted
 * BEFORE they read the rest.
 *
 * We deliberately don't rewrite the content — that risks changing
 * meaning. Instead we flag it and log the incident for prompt-tuning.
 */

export interface AllergyCheckResult {
  matched: string[]; // distinct allergen terms that appeared
  warnedResponse: string; // response to show the user (original if no match)
}

/** Build a regex that matches an allergen word-boundary, case-insensitive.
 *  Escapes regex specials so "shellfish" works and "peanut" also catches
 *  "peanuts" via \w* tail. */
function allergenPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\w{0,6}\\b`, 'i');
}

export function checkAllergies(
  response: string,
  allergens: string[],
): AllergyCheckResult {
  if (!response || allergens.length === 0) {
    return { matched: [], warnedResponse: response };
  }

  const matched = new Set<string>();
  for (const allergen of allergens) {
    const term = allergen.trim();
    if (!term || term.toLowerCase() === 'none') continue;
    if (allergenPattern(term).test(response)) {
      matched.add(term);
    }
  }

  if (matched.size === 0) {
    return { matched: [], warnedResponse: response };
  }

  const list = Array.from(matched);
  const banner = `⚠️ **Allergy check — please review:** This response mentions **${list.join(', ')}**, which you have listed as an allergen. Double-check every suggestion with your doctor before acting.\n\n---\n\n`;
  return {
    matched: list,
    warnedResponse: banner + response,
  };
}
