'use client'

import { useState, useEffect } from 'react'
import { FiPlus, FiSave, FiArrowLeft } from 'react-icons/fi'
import Link from 'next/link'
import StepEditor, { type WorkflowStep, type StepAction } from './StepEditor'

// Fallback (used until API loads)
const FALLBACK_PROVIDER_TYPES = [
  'DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
  'PHARMACIST', 'INSURANCE_REP', 'CAREGIVER', 'PHYSIOTHERAPIST',
  'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
]

const SERVICE_MODES = [
  { value: 'office', label: 'Office' },
  { value: 'home', label: 'Home Visit' },
  { value: 'video', label: 'Video Call' },
]

interface WorkflowBuilderProps {
  backHref: string
  initialData?: {
    id?: string
    name: string
    slug: string
    description: string
    providerType: string
    serviceMode: string
    steps: WorkflowStep[]
    transitions: Array<{ from: string; to: string; action: string; allowedRoles: string[] }>
  }
  onSave?: (data: unknown) => void
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

export default function WorkflowBuilder({ backHref, initialData, onSave }: WorkflowBuilderProps) {
  const isEdit = !!initialData?.id

  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [providerType, setProviderType] = useState(initialData?.providerType || '')
  const [serviceMode, setServiceMode] = useState(initialData?.serviceMode || 'office')
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialData?.steps || [
      { order: 1, statusCode: 'pending', label: 'Demande envoyee', actionsForPatient: [{ action: 'cancel', label: 'Annuler', targetStatus: 'cancelled', style: 'danger' }], actionsForProvider: [{ action: 'accept', label: 'Accepter', targetStatus: 'confirmed', style: 'primary' }, { action: 'deny', label: 'Refuser', targetStatus: 'cancelled', style: 'danger' }], flags: {}, notifyProvider: { title: 'Nouvelle demande', message: '{{patientName}} demande un(e) {{serviceName}}' }, notifyPatient: null },
      { order: 2, statusCode: 'confirmed', label: 'Confirme', actionsForPatient: [{ action: 'cancel', label: 'Annuler', targetStatus: 'cancelled', style: 'danger' }], actionsForProvider: [{ action: 'start', label: 'Demarrer', targetStatus: 'in_progress', style: 'primary' }], flags: { triggers_payment: true, triggers_conversation: true }, notifyPatient: { title: 'Confirme', message: 'Votre reservation avec {{providerName}} est confirmee' }, notifyProvider: null },
      { order: 3, statusCode: 'in_progress', label: 'En cours', actionsForPatient: [], actionsForProvider: [{ action: 'complete', label: 'Terminer', targetStatus: 'completed', style: 'primary' }], flags: {}, notifyPatient: { title: 'En cours', message: 'Votre session a commence' }, notifyProvider: null },
      { order: 4, statusCode: 'completed', label: 'Termine', actionsForPatient: [], actionsForProvider: [], flags: { triggers_review_request: true }, notifyPatient: { title: 'Termine', message: 'Merci de laisser un avis' }, notifyProvider: null },
      { order: 5, statusCode: 'cancelled', label: 'Annule', actionsForPatient: [], actionsForProvider: [], flags: { triggers_refund: true }, notifyPatient: { title: 'Annule', message: 'Votre reservation a ete annulee' }, notifyProvider: null },
    ]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [providerTypes, setProviderTypes] = useState<string[]>(FALLBACK_PROVIDER_TYPES)

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

  const allStatusCodes = steps.map(s => s.statusCode)

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

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: finalSlug,
          description,
          providerType,
          serviceMode,
          steps,
          transitions,
        }),
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-navy hover:bg-brand-teal text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">Workflow saved successfully!</div>}

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
            <select value={providerType} onChange={(e) => setProviderType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
              <option value="">Global (All Providers)</option>
              {providerTypes.map(pt => <option key={pt} value={pt}>{pt.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Service Mode *</label>
            <select value={serviceMode} onChange={(e) => setServiceMode(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal">
              {SERVICE_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal" />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Workflow Steps ({steps.length})</h2>
          <button type="button" onClick={addStep} className="text-sm text-brand-teal hover:text-brand-navy flex items-center gap-1 font-medium">
            <FiPlus className="w-4 h-4" /> Add Step
          </button>
        </div>

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
    </div>
  )
}
