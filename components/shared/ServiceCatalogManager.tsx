'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import {
 FaPlus, FaEdit, FaTrash, FaSearch, FaSpinner, FaTimes,
 FaCheckCircle, FaTimesCircle, FaFilter
} from 'react-icons/fa'
import ServiceWorkflowLinker from '@/components/workflow/ServiceWorkflowLinker'

export interface ServiceField {
 key: string
 label: string
 type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox'
 required?: boolean
 placeholder?: string
 options?: { value: string; label: string }[]
 defaultValue?: string | number | boolean
}

export interface ServiceCatalogConfig {
 title: string
 apiBasePath: string // e.g. '/api/services/my-services'
 categoryOptions: { value: string; label: string }[]
 fields: ServiceField[]
 /** Accent color for buttons/badges (tailwind class prefix, e.g. 'teal', 'blue', 'red') */
 accentColor?: string
 /** Provider type for workflow linking (e.g. 'DOCTOR') */
 providerType?: string
 /** Href to create a new workflow (e.g. '/doctor/workflows/create') */
 workflowCreateHref?: string
 /** Override API path for creating services (defaults to apiBasePath) */
 createApiPath?: string
}

interface ServiceItem {
 id: string
 serviceName: string
 category: string
 description: string
 price: number
 currency?: string
 isActive: boolean
 [key: string]: unknown
}

export default function ServiceCatalogManager({ config }: { config: ServiceCatalogConfig }) {
 const { user } = useUser()
 const [services, setServices] = useState<ServiceItem[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [searchQuery, setSearchQuery] = useState('')
 const [filterCategory, setFilterCategory] = useState('')
 const [showModal, setShowModal] = useState(false)
 const [editingService, setEditingService] = useState<ServiceItem | null>(null)
 const [formData, setFormData] = useState<Record<string, unknown>>({})
 const [saving, setSaving] = useState(false)
 const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
 const [cachedWorkflows, setCachedWorkflows] = useState<unknown[] | undefined>(undefined)

 const accent = config.accentColor || 'teal'

 // Fetch workflows once for all service cards
 useEffect(() => {
   if (!config.providerType) return
   fetch(`/api/workflow/templates?providerType=${config.providerType}`, { credentials: 'include' })
     .then(r => r.json())
     .then(data => { if (data.success) setCachedWorkflows(data.data) })
     .catch(() => {})
 }, [config.providerType])

 const fetchServices = useCallback(async () => {
 try {
 const res = await fetch(config.apiBasePath, { credentials: 'include' })
 if (!res.ok) throw new Error('Failed to fetch services')
 const data = await res.json()
 // Normalize: my-services API returns configId instead of id
 const items = (data.data || []).map((s: Record<string, unknown>) => {
   const ps = s.platformService as Record<string, unknown> | undefined
   return {
     ...s,
     id: s.id || s.configId || s.platformServiceId,
     serviceName: (s.serviceName as string) || (ps?.serviceName as string) || 'Unnamed Service',
     description: (s.description as string) || (ps?.description as string) || '',
     category: (s.category as string) || (ps?.category as string) || 'General',
     defaultPrice: s.defaultPrice ?? s.priceOverride ?? ps?.defaultPrice ?? 0,
     duration: s.duration ?? ps?.duration ?? 30,
     currency: (s.currency as string) || (ps?.currency as string) || 'MUR',
   }
 })
 setServices(items)
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to load services')
 } finally {
 setLoading(false)
 }
 }, [config.apiBasePath])

 useEffect(() => {
 if (user?.id) fetchServices()
 }, [user?.id, fetchServices])

 const openCreateModal = () => {
 setEditingService(null)
 const defaults: Record<string, unknown> = {}
 config.fields.forEach(f => {
 if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue
 else if (f.type === 'checkbox') defaults[f.key] = true
 else if (f.type === 'number') defaults[f.key] = ''
 else defaults[f.key] = ''
 })
 setFormData(defaults)
 setShowModal(true)
 }

 const openEditModal = (service: ServiceItem) => {
 setEditingService(service)
 const data: Record<string, unknown> = {}
 config.fields.forEach(f => {
 data[f.key] = service[f.key] ?? ''
 })
 setFormData(data)
 setShowModal(true)
 }

 const handleSave = async () => {
 setSaving(true)
 setMessage(null)
 try {
 const url = editingService
 ? `${config.apiBasePath}/${editingService.id}`
 : (config.createApiPath || config.apiBasePath)
 const method = editingService ? 'PUT' : 'POST'

 const res = await fetch(url, {
 method,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(formData),
 })

 if (!res.ok) {
 const err = await res.json().catch(() => ({ message: 'Request failed' }))
 throw new Error(err.message || 'Request failed')
 }

 setMessage({ type: 'success', text: editingService ? 'Service updated successfully' : 'Service created successfully' })
 setShowModal(false)
 fetchServices()
 } catch (err) {
 setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
 } finally {
 setSaving(false)
 }
 }

 const handleDelete = async (id: string) => {
 if (!confirm('Are you sure you want to delete this service?')) return
 try {
 const res = await fetch(`${config.apiBasePath}/${id}`, { method: 'DELETE' })
 if (!res.ok) throw new Error('Delete failed')
 setMessage({ type: 'success', text: 'Service deleted successfully' })
 fetchServices()
 } catch (err) {
 setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete' })
 }
 }

 const filtered = services
 .filter(s => {
 if (filterCategory && s.category !== filterCategory) return false
 if (searchQuery) {
 const q = searchQuery.toLowerCase()
 return s.serviceName.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
 }
 return true
 })

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <FaSpinner className={`animate-spin text-3xl text-${accent}-600`} />
 </div>
 )
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
 <p className="text-gray-500 text-sm mt-1">
 {services.length} service{services.length !== 1 ? 's' : ''} configured
 </p>
 </div>
 <button
 onClick={openCreateModal}
 className={`flex items-center gap-2 px-4 py-2.5 bg-${accent}-600 text-white rounded-lg hover:bg-${accent}-700 transition font-medium text-sm`}
 >
 <FaPlus /> Add Service
 </button>
 </div>

 {/* Messages */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)}><FaTimesCircle /></button>
 </div>
 )}
 {message && (
 <div className={`${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} border px-4 py-3 rounded-lg flex items-center justify-between`}>
 <span className="flex items-center gap-2">
 {message.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
 {message.text}
 </span>
 <button onClick={() => setMessage(null)}><FaTimes /></button>
 </div>
 )}

 {/* Search + Filter */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search services..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-${accent}-500 focus:ring-2 focus:ring-${accent}-200 transition text-sm`}
 />
 </div>
 <div className="relative">
 <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <select
 value={filterCategory}
 onChange={e => setFilterCategory(e.target.value)}
 className="pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm appearance-none bg-white"
 >
 <option value="">All Categories</option>
 {config.categoryOptions.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Service Cards */}
 {filtered.length === 0 ? (
 <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
 <h3 className="text-lg font-semibold text-gray-700 mb-2">
 {services.length === 0 ? 'No Services Yet' : 'No matching services'}
 </h3>
 <p className="text-gray-500 text-sm">
 {services.length === 0
 ? 'Add your first service to start accepting bookings with specific pricing.'
 : 'Try adjusting your search or filter criteria.'}
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filtered.map(service => (
 <div key={service.id || (service as Record<string,unknown>).configId as string || service.serviceName} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-gray-900 truncate">{service.serviceName}</h3>
 <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 bg-${accent}-50 text-${accent}-700`}>
 {service.category}
 </span>
 </div>
 <div className="flex items-center gap-1 ml-2">
 <button
 onClick={() => openEditModal(service)}
 className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
 title="Edit"
 >
 <FaEdit className="text-sm" />
 </button>
 <button
 onClick={() => handleDelete(service.id)}
 className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
 title="Delete"
 >
 <FaTrash className="text-sm" />
 </button>
 </div>
 </div>
 <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
 <div className="flex items-center justify-between pt-3 border-t border-gray-100">
 <span className="text-lg font-bold text-gray-900">
 {service.currency || 'MUR'} {(service.price ?? 0).toLocaleString()}
 </span>
 <span className={`text-xs px-2 py-0.5 rounded-full ${service.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
 {service.isActive ? 'Active' : 'Inactive'}
 </span>
 </div>
 {config.providerType && cachedWorkflows && (
 <div className="pt-3 border-t border-gray-100 mt-3">
 <p className="text-xs font-medium text-gray-500 mb-1">Linked Workflow</p>
 <ServiceWorkflowLinker
 serviceId={(service.platformServiceId as string) || service.id}
 serviceName={service.serviceName}
 providerType={config.providerType}
 createWorkflowHref={config.workflowCreateHref || '#'}
 workflows={cachedWorkflows as never[]}
 />
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {/* Modal */}
 {showModal && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-5 border-b">
 <h2 className="text-lg font-bold text-gray-900">
 {editingService ? 'Edit Service' : 'Add New Service'}
 </h2>
 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
 <FaTimes />
 </button>
 </div>
 <div className="p-5 space-y-4">
 {config.fields.map(field => (
 <div key={field.key}>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {field.label} {field.required && <span className="text-red-500">*</span>}
 </label>
 {field.type === 'select' ? (
 <select
 value={String(formData[field.key] || '')}
 onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
 className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
 >
 <option value="">Select {field.label}</option>
 {field.options?.map(opt => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 ) : field.type === 'textarea' ? (
 <textarea
 value={String(formData[field.key] || '')}
 onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
 placeholder={field.placeholder}
 rows={3}
 className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm resize-none"
 />
 ) : field.type === 'checkbox' ? (
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={!!formData[field.key]}
 onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.checked }))}
 className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
 />
 <span className="text-sm text-gray-600">Enabled</span>
 </label>
 ) : (
 <input
 type={field.type}
 value={String(formData[field.key] ?? '')}
 onChange={e => setFormData(prev => ({ ...prev, [field.key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))}
 placeholder={field.placeholder}
 className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
 />
 )}
 </div>
 ))}
 </div>
 <div className="flex items-center justify-end gap-3 p-5 border-t">
 <button
 onClick={() => setShowModal(false)}
 className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
 >
 Cancel
 </button>
 <button
 onClick={handleSave}
 disabled={saving}
 className={`px-4 py-2.5 bg-${accent}-600 text-white rounded-lg hover:bg-${accent}-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2`}
 >
 {saving && <FaSpinner className="animate-spin" />}
 {editingService ? 'Update' : 'Create'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
