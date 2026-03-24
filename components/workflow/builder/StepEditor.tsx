'use client'

import { useState } from 'react'
import { FiTrash2, FiChevronDown, FiChevronUp, FiPlus, FiMenu } from 'react-icons/fi'
import StepFlagToggles, { type StepFlags } from './StepFlagToggles'

export interface StepAction {
  action: string
  label: string
  targetStatus: string
  style: 'primary' | 'danger' | 'secondary'
}

export interface WorkflowStep {
  order: number
  statusCode: string
  label: string
  description?: string
  actionsForPatient: StepAction[]
  actionsForProvider: StepAction[]
  flags: StepFlags
  notifyPatient?: { title: string; message: string } | null
  notifyProvider?: { title: string; message: string } | null
}

interface StepEditorProps {
  step: WorkflowStep
  allStatusCodes: string[]
  onChange: (step: WorkflowStep) => void
  onRemove: () => void
  isFirst: boolean
  isLast: boolean
}

export default function StepEditor({ step, allStatusCodes, onChange, onRemove, isFirst }: StepEditorProps) {
  const [expanded, setExpanded] = useState(false)

  function updateField<K extends keyof WorkflowStep>(key: K, value: WorkflowStep[K]) {
    onChange({ ...step, [key]: value })
  }

  function addAction(role: 'patient' | 'provider') {
    const key = role === 'patient' ? 'actionsForPatient' : 'actionsForProvider'
    const existing = step[key]
    updateField(key, [...existing, { action: '', label: '', targetStatus: '', style: 'primary' as const }])
  }

  function updateAction(role: 'patient' | 'provider', idx: number, action: StepAction) {
    const key = role === 'patient' ? 'actionsForPatient' : 'actionsForProvider'
    const updated = [...step[key]]
    updated[idx] = action
    updateField(key, updated)
  }

  function removeAction(role: 'patient' | 'provider', idx: number) {
    const key = role === 'patient' ? 'actionsForPatient' : 'actionsForProvider'
    updateField(key, step[key].filter((_, i) => i !== idx))
  }

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
        <FiMenu className="text-gray-400 flex-shrink-0" />
        <div className="w-7 h-7 bg-brand-navy text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
          {step.order}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={step.label}
              onChange={(e) => updateField('label', e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Step label"
              className="font-medium text-sm text-gray-900 border-0 border-b border-transparent hover:border-gray-300 focus:border-brand-teal focus:ring-0 p-0 bg-transparent"
            />
            <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{step.statusCode}</code>
          </div>
          {/* Flag badges */}
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(step.flags).filter(([, v]) => v).map(([key]) => (
              <span key={key} className="px-1.5 py-0.5 bg-brand-teal/10 text-brand-teal text-[10px] rounded font-medium">
                {key.replace(/triggers_|requires_/g, '')}
              </span>
            ))}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} disabled={isFirst} className="text-gray-400 hover:text-red-500 disabled:opacity-30 p-1">
          <FiTrash2 className="w-4 h-4" />
        </button>
        {expanded ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Status Code</label>
              <input
                type="text"
                value={step.statusCode}
                onChange={(e) => updateField('statusCode', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Description (optional)</label>
              <input
                type="text"
                value={step.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal"
              />
            </div>
          </div>

          {/* Flags */}
          <StepFlagToggles flags={step.flags} onChange={(flags) => updateField('flags', flags)} />

          {/* Actions */}
          {(['provider', 'patient'] as const).map(role => (
            <div key={role}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {role === 'provider' ? 'Provider Actions' : 'Patient Actions'}
                </p>
                <button type="button" onClick={() => addAction(role)} className="text-xs text-brand-teal hover:text-brand-navy flex items-center gap-1">
                  <FiPlus className="w-3 h-3" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {step[role === 'patient' ? 'actionsForPatient' : 'actionsForProvider'].map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100">
                    <input type="text" value={action.action} onChange={(e) => updateAction(role, idx, { ...action, action: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} placeholder="action_code" className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-brand-teal" />
                    <input type="text" value={action.label} onChange={(e) => updateAction(role, idx, { ...action, label: e.target.value })} placeholder="Button Label" className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-teal" />
                    <select value={action.targetStatus} onChange={(e) => updateAction(role, idx, { ...action, targetStatus: e.target.value })} className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-teal">
                      <option value="">Target...</option>
                      {allStatusCodes.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                    </select>
                    <select value={action.style} onChange={(e) => updateAction(role, idx, { ...action, style: e.target.value as StepAction['style'] })} className="border border-gray-200 rounded px-2 py-1.5 text-xs w-20 focus:ring-1 focus:ring-brand-teal">
                      <option value="primary">Primary</option>
                      <option value="danger">Danger</option>
                      <option value="secondary">Secondary</option>
                    </select>
                    <button type="button" onClick={() => removeAction(role, idx)} className="text-gray-400 hover:text-red-500 p-1"><FiTrash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Notifications — auto-shown when notify_patient or notify_provider flags are toggled */}
          {(['Patient', 'Provider'] as const).map(role => {
            const flagKey = role === 'Patient' ? 'notify_patient' : 'notify_provider'
            const dataKey = role === 'Patient' ? 'notifyPatient' : 'notifyProvider'
            const isActive = !!step.flags[flagKey as keyof typeof step.flags]
            const notif = step[dataKey as keyof WorkflowStep] as { title: string; message: string } | null | undefined

            // Auto-create notification object when flag is toggled ON
            if (isActive && !notif) {
              updateField(dataKey as keyof WorkflowStep, { title: '', message: '' } as never)
            }
            // Auto-remove when flag is toggled OFF
            if (!isActive && notif) {
              updateField(dataKey as keyof WorkflowStep, null as never)
            }

            if (!isActive) return null

            return (
              <div key={role} className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2">Notification to {role}</p>
                {notif && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-indigo-600 mb-0.5 block">Title</label>
                      <input type="text" value={notif.title} onChange={(e) => updateField(dataKey as keyof WorkflowStep, { ...notif, title: e.target.value } as never)} placeholder="e.g. Consultation confirmee" className="w-full border border-indigo-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-teal bg-white" />
                    </div>
                    <div>
                      <label className="text-xs text-indigo-600 mb-0.5 block">Message</label>
                      <input type="text" value={notif.message} onChange={(e) => updateField(dataKey as keyof WorkflowStep, { ...notif, message: e.target.value } as never)} placeholder="e.g. {{patientName}} a reserve..." className="w-full border border-indigo-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-brand-teal bg-white" />
                    </div>
                    <p className="text-[10px] text-indigo-400 col-span-full">Use: {'{{patientName}}, {{providerName}}, {{serviceName}}, {{amount}}, {{scheduledAt}}'}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
