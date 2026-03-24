'use client'

import { useState, useEffect, useCallback } from 'react'
import {
 FaUsers, FaSearch, FaEye, FaEdit, FaTrash, FaTimes
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'

interface PolicyHolder {
 id: string
 name: string
 email: string
 phone: string
 policyNumber: string
 policyType: string
 premium: number
 status: 'active' | 'expired' | 'suspended'
 expiryDate: string
 coverageAmount: number
}

const policyStatusConfig: Record<string, { label: string; color: string }> = {
 active: { label: 'Active', color: 'bg-green-100 text-green-800' },
 expired: { label: 'Expired', color: 'bg-red-100 text-red-800' },
 suspended: { label: 'Suspended', color: 'bg-yellow-100 text-yellow-800' },
}

export default function InsuranceClientsPage() {
 const [clients, setClients] = useState<PolicyHolder[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [searchTerm, setSearchTerm] = useState('')

 const fetchClients = useCallback(async () => {
 if (!userId) return
 try {
 setLoading(true)
 setError(null)
 const res = await fetch(`/api/insurance/${userId}/dashboard`)
 if (!res.ok) throw new Error('Failed to fetch clients')
 const json = await res.json()
 if (json.success) {
 const apiData = json.data
 // Map plans to policy holders for display
 const policyHolders: PolicyHolder[] = (apiData.plans || []).map(
 (plan: {
 id: string
 planName: string
 planType: string
 premium: number
 coverageAmount: number
 isActive: boolean
 }) => ({
 id: plan.id,
 name: plan.planName,
 email: '',
 phone: '',
 policyNumber: `POL-${plan.id.slice(0, 8).toUpperCase()}`,
 policyType: plan.planType,
 premium: plan.premium,
 status: plan.isActive ? ('active' as const) : ('expired' as const),
 expiryDate: '',
 coverageAmount: plan.coverageAmount,
 })
 )
 setClients(policyHolders)
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred')
 } finally {
 setLoading(false)
 }
 }, [userId])

 useEffect(() => {
 fetchClients()
 }, [fetchClients])

 const handleDelete = async (policyHolderId: string) => {
 if (!confirm('Are you sure you want to delete this policy?')) return
 try {
 const res = await fetch(`/api/insurance/plans/${policyHolderId}`, {
 method: 'DELETE',
 })
 if (res.ok) {
 setClients(prev => prev.filter(c => c.id !== policyHolderId))
 }
 } catch (err) {
 console.error('Failed to delete policy:', err)
 }
 }

 const handleEdit = (policyHolderId: string) => {
 window.location.href = `/insurance/plans?edit=${policyHolderId}`
 }

 const handleView = (policyHolderId: string) => {
 window.location.href = `/insurance/plans?view=${policyHolderId}`
 }

 const filteredClients = clients.filter(client => {
 if (!searchTerm) return true
 const term = searchTerm.toLowerCase()
 return (
 client.name.toLowerCase().includes(term) ||
 client.policyNumber.toLowerCase().includes(term) ||
 client.policyType.toLowerCase().includes(term)
 )
 })

 return (
 <div className="p-6 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center gap-3 mb-8">
 <FaUsers className="text-3xl text-purple-600" />
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Policy Holders</h1>
 <p className="text-sm text-gray-500">Manage your clients and their policies</p>
 </div>
 </div>

 {/* Error Banner */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)}>
 <FaTimes className="text-red-400 hover:text-red-600" />
 </button>
 </div>
 )}

 {/* Search */}
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search by name, policy number, or type..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
 />
 </div>
 </div>

 {/* Loading */}
 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"></div>
 </div>
 ) : filteredClients.length === 0 ? (
 /* Empty State */
 <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
 <FaUsers className="mx-auto text-4xl text-gray-300 mb-4" />
 <h3 className="text-lg font-medium text-gray-600 mb-1">No policy holders found</h3>
 <p className="text-sm text-gray-400">
 {searchTerm
 ? 'Try adjusting your search term.'
 : 'Policy holders will appear here when plans are created.'}
 </p>
 </div>
 ) : (
 /* Clients Table */
 <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Name
 </th>
 <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Policy Number
 </th>
 <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Policy Type
 </th>
 <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Premium (MUR)
 </th>
 <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Coverage (MUR)
 </th>
 <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Status
 </th>
 <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredClients.map((client) => {
 const statusInfo =
 policyStatusConfig[client.status] || policyStatusConfig.active
 return (
 <tr key={client.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-6 py-4">
 <div>
 <p className="font-medium text-gray-900">{client.name}</p>
 {client.email && (
 <p className="text-xs text-gray-500">{client.email}</p>
 )}
 {client.phone && (
 <p className="text-xs text-gray-500">{client.phone}</p>
 )}
 </div>
 </td>
 <td className="px-6 py-4 font-mono text-sm text-gray-700">
 {client.policyNumber}
 </td>
 <td className="px-6 py-4 text-gray-600">{client.policyType}</td>
 <td className="px-6 py-4 text-right font-semibold text-gray-900">
 Rs {client.premium.toLocaleString()}
 </td>
 <td className="px-6 py-4 text-right text-gray-600">
 Rs {client.coverageAmount.toLocaleString()}
 </td>
 <td className="px-6 py-4 text-center">
 <span
 className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}
 >
 {statusInfo.label}
 </span>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-center gap-1">
 <button
 onClick={() => handleView(client.id)}
 className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
 title="View Details"
 >
 <FaEye />
 </button>
 <button
 onClick={() => handleEdit(client.id)}
 className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
 title="Edit Policy"
 >
 <FaEdit />
 </button>
 <button
 onClick={() => handleDelete(client.id)}
 className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 title="Delete Policy"
 >
 <FaTrash />
 </button>
 </div>
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 )
}
