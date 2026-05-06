'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocationType = 'home' | 'office' | 'video' | 'audio' | 'async'
export type SampleType = 'none' | 'home' | 'office' | 'self_kit'
export type CareModelType = 'single' | 'delegated' | 'group' | 'multi'
export type UrgencyType = 'scheduled' | 'urgent' | 'emergency'
export type RecurrenceType = 'once' | 'recurring'

export interface WizardState {
  location: LocationType | null
  recurrenceType: RecurrenceType
  recurrenceFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  recurrenceInterval: number
  sessionCount: number | null
  slotDuration: number
  sample: SampleType | null
  careModel: CareModelType | null
  urgency: UrgencyType | null
}

export interface GeneratedTemplate {
  name: string
  slug: string
  description: string
  serviceMode: string
  providerType: string
  paymentTiming: string
  steps: unknown[]
  transitions: unknown[]
  serviceConfig: Record<string, unknown>
  suggestedAxes: Record<string, string>
}

export interface WorkflowWizardProps {
  onComplete: (generated: GeneratedTemplate) => void
  onCancel: () => void
  providerType?: string
  platformServiceId?: string
}

// ── Option card data ──────────────────────────────────────────────────────────

const LOCATION_OPTIONS: Array<{ value: LocationType; emoji: string; title: string; description: string }> = [
  { value: 'home', emoji: '🏠', title: 'Home Visit', description: "Provider visits the patient at home" },
  { value: 'office', emoji: '🏥', title: 'Office Visit', description: "Patient comes to the provider's office" },
  { value: 'video', emoji: '📹', title: 'Video Call', description: "Real-time video consultation" },
  { value: 'audio', emoji: '🎧', title: 'Audio Call', description: "Voice-only consultation" },
  { value: 'async', emoji: '📋', title: 'Async / Remote', description: "No real-time session (prescription renewal, second opinion)" },
]

const SAMPLE_OPTIONS: Array<{ value: SampleType; emoji: string; title: string; description: string }> = [
  { value: 'none', emoji: '🚫', title: 'No Sample', description: "No biological collection required" },
  { value: 'home', emoji: '🏠', title: 'Home Collection', description: "Provider collects sample at patient's home" },
  { value: 'office', emoji: '🏥', title: 'Office Collection', description: "Patient provides sample at the office" },
  { value: 'self_kit', emoji: '📦', title: 'Self-collection Kit', description: "Patient collects and ships the sample" },
]

const CARE_MODEL_OPTIONS: Array<{ value: CareModelType; emoji: string; title: string; description: string }> = [
  { value: 'single', emoji: '👤', title: 'Single Provider', description: "One provider handles the entire service" },
  { value: 'delegated', emoji: '👨‍⚕️', title: 'Delegated Visit', description: "Doctor assigns a nurse to visit on their behalf" },
  { value: 'multi', emoji: '👥', title: 'Multi-provider', description: "Multiple providers involved in the same session" },
  { value: 'group', emoji: '🏫', title: 'Group Session', description: "One provider, multiple patients" },
]

const URGENCY_OPTIONS: Array<{ value: UrgencyType; emoji: string; title: string; description: string }> = [
  { value: 'scheduled', emoji: '🗓️', title: 'Scheduled', description: "Standard booking with advance scheduling" },
  { value: 'urgent', emoji: '⚡', title: 'Urgent / Same-day', description: "Requires same-day response" },
  { value: 'emergency', emoji: '🚨', title: 'Emergency', description: "Immediate response required" },
]

const STEP_LABELS = [
  'Location',
  'Recurrence',
  'Sample',
  'Care Model',
  'Urgency',
  'Review',
]

const TOTAL_STEPS = 6

// ── Option Card ───────────────────────────────────────────────────────────────

function OptionCard({
  emoji,
  title,
  description,
  selected,
  onClick,
}: {
  emoji: string
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-[#0C6780] bg-[#0C6780]/5 ring-2 ring-[#0C6780]/30'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="text-3xl mb-2" aria-hidden="true">{emoji}</div>
      <div className="font-semibold text-sm text-gray-900">{title}</div>
      <div className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</div>
    </button>
  )
}

// ── Step components ───────────────────────────────────────────────────────────

function LocationStep({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {LOCATION_OPTIONS.map(opt => (
        <OptionCard
          key={opt.value}
          {...opt}
          selected={state.location === opt.value}
          onClick={() => setState({ ...state, location: opt.value })}
        />
      ))}
    </div>
  )
}

function RecurrenceStep({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="inline-flex rounded-full bg-gray-100 p-1 gap-1">
        {(['once', 'recurring'] as RecurrenceType[]).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setState({ ...state, recurrenceType: type })}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              state.recurrenceType === type
                ? 'bg-[#0C6780] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {type === 'once' ? 'One-time' : 'Recurring'}
          </button>
        ))}
      </div>

      {state.recurrenceType === 'recurring' && (
        <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Frequency</label>
            <select
              value={state.recurrenceFrequency}
              onChange={e => setState({ ...state, recurrenceFrequency: e.target.value as WizardState['recurrenceFrequency'] })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0C6780] focus:border-[#0C6780]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Every</label>
            <input
              type="number"
              min={1}
              max={52}
              value={state.recurrenceInterval}
              onChange={e => setState({ ...state, recurrenceInterval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:ring-2 focus:ring-[#0C6780] focus:border-[#0C6780]"
            />
            <span className="text-sm text-gray-600 capitalize">{state.recurrenceFrequency === 'biweekly' ? 'bi-week(s)' : state.recurrenceFrequency.replace('ly', '(s)')}</span>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Number of sessions</label>
            <input
              type="number"
              min={1}
              placeholder="Open-ended"
              value={state.sessionCount ?? ''}
              onChange={e => setState({ ...state, sessionCount: e.target.value ? parseInt(e.target.value, 10) : null })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0C6780] focus:border-[#0C6780]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Slot duration</label>
            <select
              value={state.slotDuration}
              onChange={e => setState({ ...state, slotDuration: parseInt(e.target.value, 10) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0C6780] focus:border-[#0C6780]"
            >
              {[15, 30, 45, 60, 90, 120].map(m => (
                <option key={m} value={m}>{m} minutes</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

function SampleStep({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
      {SAMPLE_OPTIONS.map(opt => (
        <OptionCard
          key={opt.value}
          {...opt}
          selected={state.sample === opt.value}
          onClick={() => setState({ ...state, sample: opt.value })}
        />
      ))}
    </div>
  )
}

function CareModelStep({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
      {CARE_MODEL_OPTIONS.map(opt => (
        <OptionCard
          key={opt.value}
          {...opt}
          selected={state.careModel === opt.value}
          onClick={() => setState({ ...state, careModel: opt.value })}
        />
      ))}
    </div>
  )
}

function UrgencyStep({ state, setState }: { state: WizardState; setState: (s: WizardState) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {URGENCY_OPTIONS.map(opt => (
        <OptionCard
          key={opt.value}
          {...opt}
          selected={state.urgency === opt.value}
          onClick={() => setState({ ...state, urgency: opt.value })}
        />
      ))}
    </div>
  )
}

function ReviewStep({
  state,
  generated,
  loading,
  error,
  onRetry,
  onComplete,
}: {
  state: WizardState
  generated: GeneratedTemplate | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onComplete: () => void
}) {
  const locationOpt = LOCATION_OPTIONS.find(o => o.value === state.location)
  const sampleOpt = SAMPLE_OPTIONS.find(o => o.value === state.sample)
  const careOpt = CARE_MODEL_OPTIONS.find(o => o.value === state.careModel)
  const urgencyOpt = URGENCY_OPTIONS.find(o => o.value === state.urgency)

  const summaryItems = [
    { label: 'Location', value: locationOpt?.title ?? '—', emoji: locationOpt?.emoji ?? '📍' },
    { label: 'Recurrence', value: state.recurrenceType === 'once' ? 'One-time' : `Recurring (${state.recurrenceFrequency})`, emoji: state.recurrenceType === 'once' ? '1️⃣' : '🔄' },
    { label: 'Sample', value: sampleOpt?.title ?? '—', emoji: sampleOpt?.emoji ?? '🧪' },
    { label: 'Care model', value: careOpt?.title ?? '—', emoji: careOpt?.emoji ?? '👤' },
    { label: 'Urgency', value: urgencyOpt?.title ?? '—', emoji: urgencyOpt?.emoji ?? '⏱️' },
    { label: 'Slot duration', value: `${state.slotDuration} min`, emoji: '⏱️' },
  ]

  return (
    <div className="space-y-5">
      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        {summaryItems.map(item => (
          <div key={item.label} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">{item.emoji}</span>
            <div>
              <div className="text-xs text-gray-500 font-medium">{item.label}</div>
              <div className="text-sm font-semibold text-gray-900 mt-0.5">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* API result area */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start justify-between gap-3">
          <span className="text-sm">Could not generate template. Please try again.</span>
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-semibold text-red-700 underline whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-[#9AE1FF]/20 border border-[#9AE1FF] rounded-xl p-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#0C6780] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-[#001E40] font-medium">Generating template...</span>
        </div>
      )}

      {generated && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <div className="text-xs text-gray-500 font-medium">Generated template</div>
            <div className="text-base font-bold text-[#001E40] mt-0.5">{generated.name}</div>
            {generated.description && (
              <div className="text-sm text-gray-600 mt-1">{generated.description}</div>
            )}
          </div>

          {/* Step pills */}
          {Array.isArray(generated.steps) && generated.steps.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 font-medium mb-2">
                {generated.steps.length} steps
              </div>
              <div className="flex flex-wrap gap-2">
                {(generated.steps as Array<{ statusCode?: string; label?: string; order?: number }>).map((step, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs bg-[#9AE1FF]/20 border border-[#9AE1FF] text-[#001E40] rounded-full px-2.5 py-1 font-medium"
                  >
                    {i + 1}. {step.label || step.statusCode || `Step ${i + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onComplete}
            className="w-full bg-[#001E40] hover:bg-[#0C6780] text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Build Template →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

const INITIAL_STATE: WizardState = {
  location: null,
  recurrenceType: 'once',
  recurrenceFrequency: 'weekly',
  recurrenceInterval: 1,
  sessionCount: null,
  slotDuration: 60,
  sample: null,
  careModel: null,
  urgency: null,
}

/** Returns true if the current step has a valid selection */
function isStepComplete(step: number, state: WizardState): boolean {
  switch (step) {
    case 1: return state.location !== null
    case 2: return true // recurrence always has a default
    case 3: return state.sample !== null
    case 4: return state.careModel !== null
    case 5: return state.urgency !== null
    case 6: return false // controlled by API response
    default: return false
  }
}

export default function WorkflowWizard({
  onComplete,
  onCancel,
  providerType,
  platformServiceId,
}: WorkflowWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [state, setState] = useState<WizardState>(INITIAL_STATE)

  const [generated, setGenerated] = useState<GeneratedTemplate | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const generatedRef = useRef(false)

  // Call generate API when step 6 is first reached
  useEffect(() => {
    if (currentStep !== 6 || generatedRef.current) return
    generatedRef.current = true
    callGenerateApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  async function callGenerateApi() {
    setGenerating(true)
    setGenerateError(null)
    setGenerated(null)
    try {
      const res = await fetch('/api/workflow/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: state.location,
          recurrenceType: state.recurrenceType,
          recurrenceFrequency: state.recurrenceFrequency,
          recurrenceInterval: state.recurrenceInterval,
          sessionCount: state.sessionCount,
          slotDuration: state.slotDuration,
          sample: state.sample,
          careModel: state.careModel,
          urgency: state.urgency,
          providerType,
          platformServiceId,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Generation failed')
      setGenerated(json.data as GeneratedTemplate)
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function handleRetry() {
    generatedRef.current = true // stay true so the effect doesn't double-fire
    callGenerateApi()
  }

  function goNext() {
    if (currentStep < TOTAL_STEPS) {
      setDirection(1)
      setCurrentStep(s => s + 1)
    }
  }

  function goBack() {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep(s => s - 1)
    }
  }

  const canNext = isStepComplete(currentStep, state)

  const stepTitle = STEP_LABELS[currentStep - 1]

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 20 : -20, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -20 : 20, opacity: 0 }),
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#001E40] to-[#0C6780] px-6 py-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">Configure with Wizard</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/70 hover:text-white text-xs font-medium"
          >
            Cancel
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#9AE1FF] rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-white/60">
          <span>Step {currentStep} of {TOTAL_STEPS}</span>
          <span>{stepTitle}</span>
        </div>
      </div>

      {/* Step content */}
      <div className="px-6 py-5">
        <h3 className="text-sm font-semibold text-[#001E40] mb-4">
          {currentStep === 1 && 'Where does the service take place?'}
          {currentStep === 2 && 'How often does this service repeat?'}
          {currentStep === 3 && 'Does this service require a biological sample?'}
          {currentStep === 4 && 'Who delivers the service?'}
          {currentStep === 5 && 'What is the booking urgency?'}
          {currentStep === 6 && 'Review your workflow configuration'}
        </h3>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {currentStep === 1 && <LocationStep state={state} setState={setState} />}
            {currentStep === 2 && <RecurrenceStep state={state} setState={setState} />}
            {currentStep === 3 && <SampleStep state={state} setState={setState} />}
            {currentStep === 4 && <CareModelStep state={state} setState={setState} />}
            {currentStep === 5 && <UrgencyStep state={state} setState={setState} />}
            {currentStep === 6 && (
              <ReviewStep
                state={state}
                generated={generated}
                loading={generating}
                error={generateError}
                onRetry={handleRetry}
                onComplete={() => generated && onComplete(generated)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStep === 1}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none transition"
        >
          ← Back
        </button>

        {currentStep < TOTAL_STEPS && (
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className="px-5 py-2 bg-[#0C6780] hover:bg-[#001E40] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Next →
          </button>
        )}

        {/* On review step, "Build Template" is inside the ReviewStep card */}
        {currentStep === TOTAL_STEPS && !generated && !generating && !generateError && (
          <span className="text-xs text-gray-400">Generating...</span>
        )}
      </div>
    </div>
  )
}
