'use client'

import { useState, useEffect } from 'react'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { DashboardLoadingState } from '@/components/dashboard'
import { FiSettings, FiChevronDown, FiChevronUp, FiCheckCircle, FiList, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import Link from 'next/link'

interface WorkflowTemplate {
  id: string
  name: string
  slug: string
  providerType: string
  serviceMode: string
  isDefault: boolean
  isActive: boolean
  steps: Array<{
    order: number
    statusCode: string
    label: string
    flags: Record<string, boolean | string>
    actionsForPatient: Array<{ action: string; label: string }>
    actionsForProvider: Array<{ action: string; label: string }>
  }>
  transitions: Array<{ from: string; to: string; action: string; allowedRoles: string[] }>
  createdAt: string
}

const FLAG_LABELS: Record<string, string> = {
  triggers_video_call: 'Video Call',
  triggers_payment: 'Payment',
  triggers_refund: 'Refund',
  triggers_conversation: 'Chat',
  triggers_review_request: 'Review',
  triggers_stock_check: 'Stock Check',
  triggers_stock_subtract: 'Stock Subtract',
  requires_prescription: 'Prescription Required',
  requires_content: 'Content Required',
}

const MODE_LABELS: Record<string, string> = {
  office: 'Office',
  home: 'Home Visit',
  video: 'Video Call',
}

export default function RegionalWorkflowsPage() {
  const user = useDashboardUser()
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('')

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/workflow/templates')
      const data = await res.json()
      if (data.success) setTemplates(data.data)
    } catch {
      console.error('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/workflow/templates/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setTemplates(templates.filter(t => t.id !== id))
      } else {
        alert(data.message || 'Failed to delete')
      }
    } catch {
      alert('Failed to delete workflow')
    }
  }

  if (!user) return <DashboardLoadingState />

  const providerTypes = [...new Set(templates.map(t => t.providerType))].sort()
  const filtered = filterType ? templates.filter(t => t.providerType === filterType) : templates

  // Group by provider type
  const grouped = filtered.reduce<Record<string, WorkflowTemplate[]>>((acc, t) => {
    if (!acc[t.providerType]) acc[t.providerType] = []
    acc[t.providerType].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage status workflows for all provider types. {templates.length} templates configured.
          </p>
        </div>
        <Link href="/regional/workflows/create" className="bg-brand-navy hover:bg-brand-teal text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition">
          <FiPlus className="w-4 h-4" /> Create Workflow
        </Link>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal"
        >
          <option value="">All Provider Types</option>
          {providerTypes.map(pt => (
            <option key={pt} value={pt}>{pt.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} templates</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([providerType, tpls]) => (
            <div key={providerType}>
              <h2 className="text-lg font-semibold text-brand-navy mb-3 flex items-center gap-2">
                <FiSettings className="w-5 h-5 text-brand-teal" />
                {providerType.replace(/_/g, ' ')}
                <span className="text-xs font-normal text-gray-400">({tpls.length} workflows)</span>
              </h2>

              <div className="space-y-2">
                {tpls.map(tpl => (
                  <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Template header */}
                    <div
                      onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tpl.serviceMode === 'video' ? 'bg-purple-100 text-purple-700' :
                          tpl.serviceMode === 'home' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {MODE_LABELS[tpl.serviceMode] || tpl.serviceMode}
                        </span>
                        <span className="font-medium text-gray-900 text-sm">{tpl.name}</span>
                        <span className="text-xs text-gray-400">{tpl.steps.length} steps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!tpl.isDefault && (
                          <>
                            <Link href={`/regional/workflows/${tpl.id}`} onClick={(e) => e.stopPropagation()} className="text-brand-teal hover:text-brand-navy p-1" title="Edit">
                              <FiEdit2 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id, tpl.name) }}
                              className="text-gray-400 hover:text-red-500 p-1 transition" title="Delete"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {tpl.isActive ? (
                          <FiCheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-xs text-red-500">Inactive</span>
                        )}
                        {expandedId === tpl.id ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>

                    {/* Expanded: show steps */}
                    {expandedId === tpl.id && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          <FiList className="inline w-3 h-3 mr-1" />
                          Workflow Steps
                        </h4>

                        <div className="space-y-2">
                          {tpl.steps.sort((a, b) => a.order - b.order).map((step, idx) => (
                            <div key={step.statusCode} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                              {/* Step number */}
                              <div className="w-7 h-7 bg-brand-navy text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {idx + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm text-gray-900">{step.label}</span>
                                  <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{step.statusCode}</code>
                                </div>

                                {/* Flags */}
                                {Object.entries(step.flags).filter(([, v]) => v).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {Object.entries(step.flags).filter(([, v]) => v).map(([flag, val]) => (
                                      <span key={flag} className="px-1.5 py-0.5 bg-brand-teal/10 text-brand-teal text-xs rounded font-medium">
                                        {FLAG_LABELS[flag] || flag}
                                        {typeof val === 'string' ? `: ${val}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {step.actionsForProvider.map(a => (
                                    <span key={a.action} className="px-1.5 py-0.5 bg-brand-navy/10 text-brand-navy text-xs rounded">
                                      Provider: {a.label}
                                    </span>
                                  ))}
                                  {step.actionsForPatient.map(a => (
                                    <span key={a.action} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                      Patient: {a.label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Transitions */}
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">
                          Transitions
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {tpl.transitions.map((tr, i) => (
                            <span key={i} className="text-xs bg-white border border-gray-200 rounded px-2 py-1 text-gray-600">
                              {tr.from} <span className="text-brand-teal font-bold mx-1">→</span> {tr.to}
                              <span className="text-gray-400 ml-1">({tr.action})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
