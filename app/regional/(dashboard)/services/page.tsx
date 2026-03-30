'use client'

import { useState, useEffect } from 'react'
import { useDashboardUser } from '@/hooks/useDashboardUser'
import { DashboardLoadingState } from '@/components/dashboard'
import { FiSearch, FiFilter } from 'react-icons/fi'
import ServiceWorkflowLinker from '@/components/workflow/ServiceWorkflowLinker'

interface PlatformService {
  id: string
  providerType: string
  serviceName: string
  category: string
  description: string
  defaultPrice: number
  isDefault: boolean
  isActive: boolean
}

const FALLBACK_TYPES = [
  'DOCTOR', 'NURSE', 'NANNY', 'LAB_TECHNICIAN', 'EMERGENCY_WORKER',
  'PHARMACIST', 'CAREGIVER', 'PHYSIOTHERAPIST', 'DENTIST', 'OPTOMETRIST', 'NUTRITIONIST',
]

export default function RegionalServicesPage() {
  const user = useDashboardUser()
  const [services, setServices] = useState<PlatformService[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [PROVIDER_TYPES, setProviderTypes] = useState<string[]>(FALLBACK_TYPES)

  // Fetch provider types dynamically
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
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    fetch('/api/services/catalog')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const flat: PlatformService[] = []
          for (const group of data.data) {
            const pt = (group.category as string).split(' — ')[0] || ''
            for (const svc of (group.services || []) as PlatformService[]) {
              flat.push({ ...svc, providerType: pt, category: (group.category as string).split(' — ')[1] || group.category, defaultPrice: svc.defaultPrice ?? 0 })
            }
          }
          setServices(flat)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch workflows once when filterType changes
  const [cachedWorkflows, setCachedWorkflows] = useState<unknown[]>([])
  useEffect(() => {
    if (!filterType) { setCachedWorkflows([]); return }
    fetch(`/api/workflow/templates?providerType=${filterType}`)
      .then(r => r.json())
      .then(data => { if (data.success) setCachedWorkflows(data.data) })
      .catch(() => {})
  }, [filterType])

  if (!user) return <DashboardLoadingState />

  const filtered = services.filter(s => {
    if (filterType && s.providerType !== filterType) return false
    if (search && !s.serviceName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = filtered.reduce<Record<string, PlatformService[]>>((acc, s) => {
    if (!acc[s.providerType]) acc[s.providerType] = []
    acc[s.providerType].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service & Workflow Management</h1>
        <p className="text-sm text-gray-500 mt-1">Assign workflows to platform services. {services.length} services total.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-teal focus:border-brand-teal" />
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-gray-400" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-teal">
            <option value="">Select Provider Type</option>
            {PROVIDER_TYPES.map(pt => <option key={pt} value={pt}>{pt.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal" /></div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([providerType, svcs]) => (
            <div key={providerType}>
              <h2 className="text-lg font-semibold text-brand-navy mb-3">{providerType.replace(/_/g, ' ')} <span className="text-xs font-normal text-gray-400">({svcs.length})</span></h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {svcs.map(svc => (
                  <div key={svc.id} className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{svc.serviceName}</h3>
                        <p className="text-xs text-gray-500">{svc.category} &middot; Rs {svc.defaultPrice.toLocaleString()}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${svc.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {svc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{svc.description}</p>
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">Linked Workflows</p>
                      <ServiceWorkflowLinker
                        serviceId={svc.id}
                        serviceName={svc.serviceName}
                        providerType={svc.providerType}
                        createWorkflowHref="/regional/workflows/create"
                        workflows={cachedWorkflows as never[]}
                      />
                    </div>
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
