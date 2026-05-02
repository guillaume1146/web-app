'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiSave, FiArrowLeft, FiZap, FiX, FiBookOpen } from 'react-icons/fi'
import Link from 'next/link'
import StepEditor, { type WorkflowStep, type StepAction } from './StepEditor'
import WorkflowPreview from './WorkflowPreview'
export type { WorkflowStep, StepAction }

// Fallback (used until /api/roles loads). INSURANCE_REP is a capability now,
// not a provider role — excluded.
const FALLBACK_PROVIDER_TYPES = [
  'DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
  'PHARMACIST', 'CAREGIVER', 'PHYSIOTHERAPIST',
  'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
]

const SERVICE_MODES = [
  { value: 'office', label: 'Office' },
  { value: 'home', label: 'Home Visit' },
  { value: 'video', label: 'Video Call' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'recurrent', label: 'Recurrent (Programme)' },
]

const PAYMENT_TIMING_OPTIONS = [
  { value: 'ON_ACCEPTANCE', label: 'On Acceptance (standard)' },
  { value: 'IMMEDIATE', label: 'Immediate (on order)' },
  { value: 'ON_COMPLETION', label: 'On Completion (per session)' },
  { value: 'PAY_LATER', label: 'Pay Later (invoice)' },
]

function derivePaymentTiming(mode: string): string {
  if (mode === 'delivery') return 'IMMEDIATE'
  if (mode === 'emergency') return 'PAY_LATER'
  if (mode === 'recurrent') return 'ON_COMPLETION'
  return 'ON_ACCEPTANCE'
}

interface WorkflowBuilderProps {
  backHref: string
  initialData?: {
    id?: string
    name: string
    slug: string
    description: string
    providerType: string
    serviceMode: string
    paymentTiming?: string | null
    platformServiceId?: string | null
    expectedDurationHours?: number | null
    slaNote?: string | null
    isShared?: boolean
    steps: WorkflowStep[]
    transitions: Array<{ from: string; to: string; action: string; allowedRoles: string[] }>
  }
  /** When the caller already knows the author's provider type (provider
   *  builder inside /provider/[slug]/workflows/create), pass it so we skip
   *  the dropdown and preload the service list. */
  lockedProviderType?: string
  /** Show SLA + sharing fields (regional admin / central admin context) */
  showAdminFields?: boolean
  onSave?: (data: unknown) => void
}

interface PlatformServiceOption {
  id: string
  name: string
  providerType: string
  serviceMode?: string | null
  defaultPrice?: number | null
}

interface StepTypeOption {
  code: string
  label: string
  description: string | null
  category: string
  defaultFlags: Record<string, boolean | string>
  defaultActionsProvider: Array<{ action: string; label: string; targetStatus: string; style: string }>
  defaultActionsPatient: Array<{ action: string; label: string; targetStatus: string; style: string }>
}

function generateDefaultStep(order: number): WorkflowStep {
  return {
    order,
    statusCode: order === 1 ? 'pending' : `step_${order}`,
    label: order === 1 ? 'Demande envoyee' : `Step ${order}`,
    actionsForPatient: [],
    actionsForProvider: [],
    flags: {},
    notifyPatient: null,
    notifyProvider: null,
  }
}

export default function WorkflowBuilder({ backHref, initialData, lockedProviderType, showAdminFields, onSave }: WorkflowBuilderProps) {
  const isEdit = !!initialData?.id

  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [providerType, setProviderType] = useState(lockedProviderType || initialData?.providerType || '')
  const [serviceMode, setServiceMode] = useState(initialData?.serviceMode || 'office')
  const [paymentTiming, setPaymentTiming] = useState(initialData?.paymentTiming || derivePaymentTiming(initialData?.serviceMode || 'office'))
  const [platformServiceId, setPlatformServiceId] = useState<string>(initialData?.platformServiceId || '')
  const [expectedDurationHours, setExpectedDurationHours] = useState<string>(initialData?.expectedDurationHours != null ? String(initialData.expectedDurationHours) : '')
  const [slaNote, setSlaNote] = useState(initialData?.slaNote || '')
  const [isShared, setIsShared] = useState(initialData?.isShared ?? false)
  const [services, setServices] = useState<PlatformServiceOption[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialData?.steps || [
      { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [{ action: 'cancel', label: 'Annuler', targetStatus: 'cancelled', style: 'danger' }], actionsForProvider: [{ action: 'accept', label: 'Accepter', targetStatus: 'confirmed', style: 'primary' }, { action: 'deny', label: 'Refuser', targetStatus: 'cancelled', style: 'danger' }], flags: {}, notifyProvider: { title: 'Nouvelle demande', message: '{{patientName}} demande un(e) {{serviceName}}' }, notifyPatient: null },
      { order: 2, statusCode: 'confirmed', label: 'Confirme', actionsForPatient: [{ action: 'cancel', label: 'Annuler', targetStatus: 'cancelled', style: 'danger' }], actionsForProvider: [{ action: 'start', label: 'Demarrer', targetStatus: 'in_progress', style: 'primary' }], flags: {}, notifyPatient: { title: 'Confirme', message: 'Votre reservation avec {{providerName}} est confirmee. Paiement debite.' }, notifyProvider: null },
      { order: 3, statusCode: 'in_progress', label: 'En cours', actionsForPatient: [], actionsForProvider: [{ action: 'complete', label: 'Terminer', targetStatus: 'completed', style: 'primary' }], flags: {}, notifyPatient: { title: 'En cours', message: 'Votre session a commence' }, notifyProvider: null },
      { order: 4, statusCode: 'completed', label: 'Termine', actionsForPatient: [], actionsForProvider: [], flags: {}, notifyPatient: { title: 'Termine', message: 'Merci de laisser un avis' }, notifyProvider: null },
      { order: 5, statusCode: 'cancelled', label: 'Annule', actionsForPatient: [], actionsForProvider: [], flags: {}, notifyPatient: { title: 'Annule', message: 'Votre reservation a ete annulee. Remboursement en cours.' }, notifyProvider: null },
    ]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [providerTypes, setProviderTypes] = useState<string[]>(FALLBACK_PROVIDER_TYPES)
  const [view, setView] = useState<'builder' | 'preview'>('builder')
  const [stepTypes, setStepTypes] = useState<StepTypeOption[]>([])
  const [stepLibraryOpen, setStepLibraryOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  /** Groq-backed draft: replaces the current steps with an AI proposal. */
  async function draftWithAi() {
    setAiBusy(true); setAiError(null)
    try {
      const res = await fetch('/api/workflow/ai-draft', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim(), providerType, serviceMode }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'AI draft failed')
      const draftSteps = json.data?.steps
      if (!Array.isArray(draftSteps) || draftSteps.length === 0) {
        throw new Error('AI returned no steps — try a longer description.')
      }
      setSteps(draftSteps as WorkflowStep[])
      setAiOpen(false); setAiPrompt('')
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI draft failed')
    } finally { setAiBusy(false) }
  }

  // Auto-derive paymentTiming when serviceMode changes (only if user hasn't manually overridden)
  useEffect(() => {
    setPaymentTiming(derivePaymentTiming(serviceMode))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceMode])

  // Fetch step type library for quick-insert
  useEffect(() => {
    fetch('/api/workflow/step-types', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success && Array.isArray(json.data)) setStepTypes(json.data) })
      .catch(() => {})
  }, [])

  // Fetch provider types dynamically from ProviderRole table
  useEffect(() => {
    fetch('/api/roles?isProvider=true')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const codes = json.data.map((r: { code: string }) => r.code)
          if (codes.length > 0) setProviderTypes(codes)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch services for the selected provider type so the author can pick
  // which PlatformService this workflow applies to. Scoped per providerType
  // because a LAB_TECHNICIAN shouldn't see DOCTOR services in their dropdown.
  // Runs on every providerType change + resets the selection if the previously
  // picked service no longer belongs to the new provider type.
  useEffect(() => {
    if (!providerType) { setServices([]); return }
    setServicesLoading(true)
    fetch(`/api/services/catalog?providerType=${encodeURIComponent(providerType)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        // Endpoint returns: { success, data: [{ category: "DOCTOR — Consultation", services: [{id, serviceName, defaultPrice, ...}] }, ...] }
        // Flatten the category groups into a single options list and map
        // serviceName → name so the builder has a clean shape to render.
        const groups = Array.isArray(json?.data) ? json.data as Array<{ category: string; services: Array<{ id: string; serviceName: string; defaultPrice?: number }> }> : []
        const list: PlatformServiceOption[] = []
        for (const g of groups) {
          if (!Array.isArray(g?.services)) continue
          for (const r of g.services) {
            list.push({
              id: r.id,
              name: r.serviceName,
              providerType: (g.category?.split(' — ')[0]) || providerType,
              defaultPrice: r.defaultPrice ?? null,
            })
          }
        }
        setServices(list)
        if (platformServiceId && !list.some(s => s.id === platformServiceId)) {
          setPlatformServiceId('')
        }
      })
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerType])

  const allStatusCodes = steps.map(s => s.statusCode)

  /**
   * Compute every validation issue in one pass. Surfaced non-blocking in
   * a pinned panel at the bottom of the builder (Save button shows the
   * issue count). Users can edit anywhere while fixing — no modal, no
   * full-form-reset.
   */
  const issues = (() => {
    const out: Array<{ key: string; message: string; stepIdx?: number }> = []
    if (!name.trim()) out.push({ key: 'name', message: 'Workflow needs a name.' })
    if (!serviceMode) out.push({ key: 'mode', message: 'Pick a service mode.' })
    if (steps.length < 2) out.push({ key: 'steps', message: 'At least 2 steps are required.' })
    const codes = new Set<string>()
    steps.forEach((s, i) => {
      if (!s.statusCode) out.push({ key: `s-${i}-code`, message: `Step ${i + 1}: missing status code.`, stepIdx: i })
      if (codes.has(s.statusCode)) out.push({ key: `s-${i}-dup`, message: `Duplicate status code "${s.statusCode}".`, stepIdx: i })
      codes.add(s.statusCode)
      if (!s.label) out.push({ key: `s-${i}-label`, message: `Step ${i + 1}: missing label.`, stepIdx: i })
      // Terminal-state safety: step must have SOME exit OR be explicitly a dead-end (completed / cancelled).
      const isTerminal = s.statusCode === 'completed' || s.statusCode === 'cancelled'
      const hasAction = (s.actionsForPatient ?? []).length + (s.actionsForProvider ?? []).length > 0
      if (!isTerminal && !hasAction) {
        out.push({ key: `s-${i}-stuck`, message: `Step ${i + 1} ("${s.label || s.statusCode}") has no actions — bookings will get stuck here.`, stepIdx: i })
      }
      const allActions = [...(s.actionsForPatient ?? []), ...(s.actionsForProvider ?? [])]
      for (const a of allActions) {
        if (!a.targetStatus) out.push({ key: `s-${i}-a-${a.action}-target`, message: `Step ${i + 1} action "${a.action || 'unnamed'}" has no target status.`, stepIdx: i })
        else if (!steps.some((t) => t.statusCode === a.targetStatus)) {
          out.push({ key: `s-${i}-a-${a.action}-unknown`, message: `Step ${i + 1} action "${a.action}" points to "${a.targetStatus}" — no step with that code.`, stepIdx: i })
        }
      }
    })
    return out
  })()

  // Auto-generate transitions from step actions
  function generateTransitions() {
    const transitions: Array<{ from: string; to: string; action: string; allowedRoles: string[] }> = []
    for (const step of steps) {
      for (const action of step.actionsForProvider) {
        if (action.action && action.targetStatus) {
          transitions.push({ from: step.statusCode, to: action.targetStatus, action: action.action, allowedRoles: ['provider'] })
        }
      }
      for (const action of step.actionsForPatient) {
        if (action.action && action.targetStatus) {
          const existing = transitions.find(t => t.from === step.statusCode && t.to === action.targetStatus && t.action === action.action)
          if (existing) {
            if (!existing.allowedRoles.includes('patient')) existing.allowedRoles.push('patient')
          } else {
            transitions.push({ from: step.statusCode, to: action.targetStatus, action: action.action, allowedRoles: ['patient'] })
          }
        }
      }
    }
    return transitions
  }

  function autoSlug(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function insertFromStepType(st: StepTypeOption) {
    const newStep: WorkflowStep = {
      order: steps.length + 1,
      statusCode: st.code.toLowerCase(),
      label: st.label,
      flags: (st.defaultFlags ?? {}) as Record<string, boolean>,
      actionsForProvider: (st.defaultActionsProvider ?? []) as Array<{ action: string; label: string; targetStatus: string; style: 'primary' | 'danger' | 'secondary' }>,
      actionsForPatient: (st.defaultActionsPatient ?? []) as Array<{ action: string; label: string; targetStatus: string; style: 'primary' | 'danger' | 'secondary' }>,
      notifyPatient: null,
      notifyProvider: null,
    }
    const cancelledIdx = steps.findIndex(s => s.statusCode === 'cancelled')
    if (cancelledIdx >= 0) {
      const updated = [...steps]
      updated.splice(cancelledIdx, 0, newStep)
      setSteps(updated.map((s, i) => ({ ...s, order: i + 1 })))
    } else {
      setSteps([...steps, newStep].map((s, i) => ({ ...s, order: i + 1 })))
    }
    setStepLibraryOpen(false)
  }

  function addStep() {
    const newOrder = steps.length + 1
    // Insert before cancelled (last step)
    const cancelledIdx = steps.findIndex(s => s.statusCode === 'cancelled')
    const newStep = generateDefaultStep(newOrder)
    if (cancelledIdx >= 0) {
      const updated = [...steps]
      updated.splice(cancelledIdx, 0, newStep)
      setSteps(updated.map((s, i) => ({ ...s, order: i + 1 })))
    } else {
      setSteps([...steps, newStep].map((s, i) => ({ ...s, order: i + 1 })))
    }
  }

  function updateStep(idx: number, step: WorkflowStep) {
    const updated = [...steps]
    updated[idx] = step
    setSteps(updated)
  }

  function removeStep(idx: number) {
    setSteps(steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
  }

  async function handleSave() {
    if (!name || !serviceMode) {
      setError('Name and service mode are required')
      return
    }
    if (steps.length < 2) {
      setError('At least 2 steps are required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const transitions = generateTransitions()
    const finalSlug = slug || autoSlug(`${providerType}-${name}`)

    try {
      const url = isEdit ? `/api/workflow/templates/${initialData!.id}` : '/api/workflow/templates'
      const method = isEdit ? 'PATCH' : 'POST'

      const payload: Record<string, unknown> = {
        name,
        slug: finalSlug,
        description,
        providerType,
        serviceMode,
        paymentTiming,
        platformServiceId: platformServiceId || null,
        steps,
        transitions,
      }
      if (showAdminFields) {
        payload.expectedDurationHours = expectedDurationHours ? parseInt(expectedDurationHours, 10) : null
        payload.slaNote = slaNote || null
        payload.isShared = isShared
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setSlug(finalSlug)
        onSave?.(data.data)
      } else {
        setError(data.message || 'Failed to save')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={backHref} className="flex items-center gap-1 text-brand-teal hover:text-brand-navy text-sm mb-2">
            <FiArrowLeft className="w-4 h-4" /> Back to workflows
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Workflow' : 'Create Workflow'}</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="bg-white border border-[#0C6780] hover:bg-[#0C6780]/5 text-[#0C6780] px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition"
          >
            <FiZap className="w-4 h-4" /> AI draft
          </button>
          <button
            onClick={handleSave}
            disabled={saving || issues.length > 0}
            title={issues.length > 0 ? `Fix ${issues.length} issue${issues.length === 1 ? '' : 's'} first` : undefined}
            className="bg-brand-navy hover:bg-brand-teal text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            {saving ? 'Saving...' : issues.length > 0 ? `Save (${issues.length} issue${issues.length === 1 ? '' : 's'})` : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">Workflow saved successfully!</div>}

      {/* Builder / Preview tabs — Preview renders what each side actually sees. */}
      <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1 max-w-xs text-sm font-medium">
        <button
          onClick={() => setView('builder')}
          className={`flex-1 px-3 py-1.5 rounded-lg transition-colors ${view === 'builder' ? 'bg-[#0C6780] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >Builder</button>
        <button
          onClick={() => setView('preview')}
          className={`flex-1 px-3 py-1.5 rounded-lg transition-colors ${view === 'preview' ? 'bg-[#0C6780] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >Preview</button>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Workflow Name *</label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(autoSlug(`${providerType}-${e.target.value}`)) }} placeholder="e.g. Doctor Consultation - Office" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Slug (auto-generated)</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-teal focus:border-brand-teal" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Provider Type</label>
            {lockedProviderType ? (
              <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
                {lockedProviderType.replace(/_/g, ' ')}
                <span className="ml-2 text-[11px] text-gray-400">(from your role)</span>
              </div>
            ) : (
              <select value={providerType} onChange={(e) => setProviderType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
                <option value="">Global (All Providers)</option>
                {providerTypes.map(pt => <option key={pt} value={pt}>{pt.replace(/_/g, ' ')}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Service Mode *</label>
            <select value={serviceMode} onChange={(e) => setServiceMode(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
              {SERVICE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Payment Timing
              <span className="ml-1 text-gray-400 font-normal">(auto-derived from mode)</span>
            </label>
            <select value={paymentTiming} onChange={(e) => setPaymentTiming(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
              {PAYMENT_TIMING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Applies to Service
            <span className="ml-1 text-gray-400 font-normal">
              (recommended — leave empty to use as default for this provider type)
            </span>
          </label>
          {providerType ? (
            services.length > 0 ? (
              <select
                value={platformServiceId}
                onChange={(e) => setPlatformServiceId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal"
              >
                <option value="">— All {providerType.replace(/_/g, ' ')} services (default) —</option>
                {services
                  .filter(s => !s.serviceMode || s.serviceMode === serviceMode)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.defaultPrice != null ? ` · Rs ${s.defaultPrice}` : ''}
                    </option>
                  ))}
              </select>
            ) : (
              <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2">
                {servicesLoading ? 'Loading services...' : `No services yet for ${providerType.replace(/_/g, ' ')}. Ask a regional admin to add one.`}
              </p>
            )
          ) : (
            <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2">
              Pick a provider type first to see available services.
            </p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal" />
        </div>

        {showAdminFields && (
          <>
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">SLA &amp; Sharing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Expected duration (hours)</label>
                  <input
                    type="number" min={1} value={expectedDurationHours}
                    onChange={e => setExpectedDurationHours(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">SLA note</label>
                  <input
                    type="text" value={slaNote}
                    onChange={e => setSlaNote(e.target.value)}
                    placeholder="e.g. Results within 24h guaranteed"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  id="isShared"
                  type="checkbox"
                  checked={isShared}
                  onChange={e => setIsShared(e.target.checked)}
                  className="w-4 h-4 accent-brand-teal"
                />
                <label htmlFor="isShared" className="text-sm text-gray-700 cursor-pointer">
                  Share this template across regions
                  <span className="ml-1 text-xs text-gray-400">(other regional admins can clone it)</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {view === 'preview' ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <WorkflowPreview steps={steps} />
        </div>
      ) : (
      <>
      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Workflow Steps ({steps.length})</h2>
          <div className="flex items-center gap-2">
            {stepTypes.length > 0 && (
              <button type="button" onClick={() => setStepLibraryOpen(!stepLibraryOpen)} className="text-sm text-gray-600 hover:text-brand-navy flex items-center gap-1 font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50">
                <FiBookOpen className="w-4 h-4" /> Step library
              </button>
            )}
            <button type="button" onClick={addStep} className="text-sm text-brand-teal hover:text-brand-navy flex items-center gap-1 font-medium">
              <FiPlus className="w-4 h-4" /> Add blank
            </button>
          </div>
        </div>

        {/* Step type library panel */}
        {stepLibraryOpen && stepTypes.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Click a step type to insert it</p>
              <button onClick={() => setStepLibraryOpen(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400"><FiX className="w-3 h-3" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {stepTypes.map(st => (
                <button
                  key={st.code}
                  type="button"
                  onClick={() => insertFromStepType(st)}
                  className="text-left p-2.5 border border-gray-200 rounded-lg hover:border-brand-teal hover:bg-brand-teal/5 transition group"
                >
                  <div className="text-xs font-semibold text-gray-800 group-hover:text-brand-teal">{st.label}</div>
                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">{st.code}</div>
                  {st.description && <div className="text-[10px] text-gray-500 mt-1 line-clamp-2">{st.description}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {steps.map((step, idx) => (
          <StepEditor
            key={`${step.statusCode}-${idx}`}
            step={step}
            allStatusCodes={allStatusCodes}
            onChange={(s) => updateStep(idx, s)}
            onRemove={() => removeStep(idx)}
            isFirst={idx === 0}
            isLast={idx === steps.length - 1}
          />
        ))}
      </div>

      {/* Preview transitions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Auto-Generated Transitions</h2>
        <div className="flex flex-wrap gap-2">
          {generateTransitions().map((tr, i) => (
            <span key={i} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600">
              {tr.from} <span className="text-brand-teal font-bold mx-1">&rarr;</span> {tr.to}
              <span className="text-gray-400 ml-1">({tr.action})</span>
              <span className="text-gray-300 ml-1">[{tr.allowedRoles.join(', ')}]</span>
            </span>
          ))}
          {generateTransitions().length === 0 && (
            <span className="text-xs text-gray-400">Add actions to steps to see transitions</span>
          )}
        </div>
      </div>

      {/* Template Variables Help */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-brand-navy mb-2">Notification Template Variables</h3>
        <div className="flex flex-wrap gap-2">
          {['{{patientName}}', '{{providerName}}', '{{providerType}}', '{{serviceName}}', '{{scheduledAt}}', '{{amount}}', '{{status}}', '{{bookingId}}', '{{actionBy}}', '{{eta}}'].map(v => (
            <code key={v} className="text-xs bg-white border border-sky-200 rounded px-2 py-1 text-brand-teal font-mono">{v}</code>
          ))}
        </div>
      </div>
      </>
      )}

      {/* ─── Pinned validation panel — non-blocking, shows every issue ─ */}
      {issues.length > 0 && (
        <div className="sticky bottom-4 z-30 bg-amber-50 border border-amber-200 rounded-xl shadow-lg p-3">
          <div className="flex items-center gap-2 font-semibold text-amber-900 text-sm mb-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-200 text-amber-900 rounded-full text-xs font-bold">{issues.length}</span>
            {issues.length === 1 ? 'Issue to fix' : 'Issues to fix before saving'}
          </div>
          <ul className="text-xs text-amber-900 space-y-0.5 max-h-32 overflow-y-auto">
            {issues.slice(0, 8).map((i) => <li key={i.key}>• {i.message}</li>)}
            {issues.length > 8 && <li className="text-amber-700">…and {issues.length - 8} more</li>}
          </ul>
        </div>
      )}

      {/* ─── AI-assist modal ─────────────────────────────────────────── */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAiOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FiZap className="text-[#0C6780]" />
                  <h3 className="text-base font-bold text-gray-900">Draft with AI</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">Describe the workflow in plain words. We&apos;ll draft the steps, actions, flags, and notifications — you review + edit before saving. This <strong>replaces</strong> your current steps.</p>
              </div>
              <button onClick={() => setAiOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><FiX /></button>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`e.g. "A patient books a teleconsultation. The doctor accepts, video call opens, we charge the patient. If the doctor runs late, they can notify the patient with an ETA. After the call, the patient gets a prescription + review request."`}
              rows={6}
              maxLength={1000}
              className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#0C6780] focus:border-transparent outline-none resize-none"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{aiPrompt.length}/1000 · {providerType || 'no provider type yet'} · {serviceMode}</span>
              {aiError && <span className="text-red-600">{aiError}</span>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => { setAiOpen(false); setAiError(null) }}
                disabled={aiBusy}
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >Cancel</button>
              <button
                onClick={draftWithAi}
                disabled={aiBusy || aiPrompt.trim().length < 20}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-[#0C6780] hover:bg-[#001E40] text-white rounded-lg disabled:opacity-50"
              >
                <FiZap /> {aiBusy ? 'Drafting…' : 'Draft steps'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
