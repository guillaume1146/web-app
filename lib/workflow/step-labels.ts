/**
 * Workflow step-label translator.
 *
 * Step labels may be stored with a `labelKey` (e.g.
 * `workflow.step.lab-test-standard.sample_collected`) in addition to the
 * English `label`. This resolver picks the best display string for the
 * user's current locale, falling back to the DB label and finally to
 * humanised statusCode.
 *
 * Translations live in `lib/workflow/translations/{locale}.json`. Each file
 * is a flat map `{ "workflow.step.xxx.yyy": "Localised label" }`.
 */

// Static imports keep bundle small; add new locales here.
import en from './translations/en.json'
import fr from './translations/fr.json'
import mfe from './translations/mfe.json'

const DICTIONARIES: Record<string, Record<string, string>> = { en, fr, mfe }

type LocaleCode = 'en' | 'fr' | 'mfe'

function humanize(status: string): string {
  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface StepLike {
  statusCode?: string
  label?: string
  labelKey?: string
}

/**
 * Resolve the display label for a workflow step.
 *
 * @param step - StepDefinition-like object with label / labelKey / statusCode
 * @param locale - 'en' | 'fr' | 'mfe' (Mauritian Creole)
 */
export function resolveStepLabel(step: StepLike, locale: string = 'en'): string {
  const dict = DICTIONARIES[(locale as LocaleCode)] || DICTIONARIES.en
  if (step.labelKey && dict[step.labelKey]) return dict[step.labelKey]
  if (step.label) return step.label
  if (step.statusCode) return humanize(step.statusCode)
  return 'Update'
}

/**
 * Same thing for action labels: `action.cancel`, `action.accept`, etc.
 * Falls through to the raw label on miss.
 */
export function resolveActionLabel(action: { labelKey?: string; label?: string; action?: string }, locale: string = 'en'): string {
  const dict = DICTIONARIES[(locale as LocaleCode)] || DICTIONARIES.en
  if (action.labelKey && dict[action.labelKey]) return dict[action.labelKey]
  if (action.label) return action.label
  if (action.action) return humanize(action.action)
  return 'Action'
}
