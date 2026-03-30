'use client'

import { FiVideo, FiDollarSign, FiRefreshCw, FiMessageSquare, FiStar, FiPackage, FiShield, FiFileText, FiBell } from 'react-icons/fi'

export interface StepFlags {
  triggers_video_call?: boolean
  triggers_payment?: boolean
  triggers_refund?: boolean
  triggers_conversation?: boolean
  triggers_review_request?: boolean
  triggers_stock_check?: boolean
  triggers_stock_subtract?: boolean
  requires_prescription?: boolean
  requires_content?: string | boolean
  notify_patient?: boolean
  notify_provider?: boolean
}

const FLAG_CONFIG = [
  { key: 'triggers_payment', label: 'Wallet Payment', desc: 'Check balance + debit patient, credit provider (always required for bookings)', icon: FiDollarSign, color: 'text-green-600 bg-green-50', mandatory: true },
  { key: 'triggers_video_call', label: 'Video Call', desc: 'Auto-create video room when this step is reached', icon: FiVideo, color: 'text-purple-600 bg-purple-50' },
  { key: 'triggers_refund', label: 'Refund', desc: 'Refund patient based on cancellation policy', icon: FiRefreshCw, color: 'text-orange-600 bg-orange-50' },
  { key: 'triggers_conversation', label: 'Chat', desc: 'Auto-create chat conversation between patient & provider', icon: FiMessageSquare, color: 'text-blue-600 bg-blue-50' },
  { key: 'triggers_review_request', label: 'Review Request', desc: 'Send review prompt to patient after completion', icon: FiStar, color: 'text-yellow-600 bg-yellow-50' },
  { key: 'triggers_stock_check', label: 'Stock Check', desc: 'Validate inventory availability before proceeding', icon: FiPackage, color: 'text-cyan-600 bg-cyan-50' },
  { key: 'triggers_stock_subtract', label: 'Stock Subtract', desc: 'Decrement inventory stock after transition', icon: FiPackage, color: 'text-red-600 bg-red-50' },
  { key: 'requires_prescription', label: 'Prescription Required', desc: 'Validate patient has a valid prescription', icon: FiShield, color: 'text-pink-600 bg-pink-50' },
  { key: 'notify_patient', label: 'Notify Patient', desc: 'Send custom notification to patient when this step is reached', icon: FiBell, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'notify_provider', label: 'Notify Provider', desc: 'Send custom notification to provider when this step is reached', icon: FiBell, color: 'text-teal-600 bg-teal-50' },
] as const

const CONTENT_TYPES = [
  { value: '', label: 'None' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_result', label: 'Lab Results' },
  { value: 'care_notes', label: 'Care Notes' },
  { value: 'report', label: 'Medical Report' },
  { value: 'dental_chart', label: 'Dental Chart' },
  { value: 'eye_prescription', label: 'Eye Prescription' },
  { value: 'meal_plan', label: 'Meal Plan' },
  { value: 'exercise_plan', label: 'Exercise Plan' },
]

interface StepFlagTogglesProps {
  flags: StepFlags
  onChange: (flags: StepFlags) => void
}

export default function StepFlagToggles({ flags, onChange }: StepFlagTogglesProps) {
  function toggleFlag(key: string) {
    onChange({ ...flags, [key]: !flags[key as keyof StepFlags] })
  }

  function setContentType(value: string) {
    onChange({ ...flags, requires_content: value || undefined })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Triggered Actions</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FLAG_CONFIG.map(({ key, label, desc, icon: Icon, color, ...rest }) => {
          const isMandatory = 'mandatory' in rest && rest.mandatory
          const active = isMandatory || !!flags[key as keyof StepFlags]
          return (
            <button
              key={key}
              type="button"
              onClick={() => { if (!isMandatory) toggleFlag(key) }}
              disabled={isMandatory}
              className={`flex items-start gap-3 p-3 rounded-lg border transition text-left ${
                isMandatory
                  ? 'border-green-300 bg-green-50 cursor-default opacity-90'
                  : active
                    ? 'border-brand-teal bg-sky-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${color} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{label}</span>
                  {isMandatory ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-200 text-green-800">ALWAYS ON</span>
                  ) : (
                    <div className={`w-3 h-3 rounded-full border-2 ${active ? 'bg-brand-teal border-brand-teal' : 'border-gray-300'}`} />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Content requirement selector */}
      <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <FiFileText className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-gray-900">Required Content Attachment</span>
        </div>
        <select
          value={typeof flags.requires_content === 'string' ? flags.requires_content : ''}
          onChange={(e) => setContentType(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal"
        >
          {CONTENT_TYPES.map(ct => (
            <option key={ct.value} value={ct.value}>{ct.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
