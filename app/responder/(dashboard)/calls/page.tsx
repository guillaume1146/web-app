'use client'

import { useState, useEffect } from 'react'
import {
 FaAmbulance,
 FaSearch,
 FaClock,
 FaCheckCircle,
 FaTimesCircle,
 FaMapMarkerAlt,
 FaPhoneAlt,
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'

interface EmergencyCall {
 id: string
 incidentType: string
 location: string
 status: 'pending' | 'dispatched' | 'on-scene' | 'completed' | 'cancelled'
 timestamp: string
 patientName?: string
 urgency?: string
 notes?: string
}

export default function EmergencyCallsPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [calls, setCalls] = useState<EmergencyCall[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [searchTerm, setSearchTerm] = useState('')
 const [statusFilter, setStatusFilter] = useState('')

 useEffect(() => {
 if (!userId) return

 const fetchCalls = async () => {
 try {
 setLoading(true)
 const res = await fetch(`/api/responders/${userId}/calls`)
 if (!res.ok) {
 if (res.status === 404) {
 setCalls([])
 return
 }
 throw new Error('Failed to fetch emergency calls')
 }
 const json = await res.json()
 setCalls(json.data ?? json.calls ?? (Array.isArray(json) ? json : []))
 } catch (err) {
 console.error('Failed to fetch emergency calls:', err)
 setError(err instanceof Error ? err.message : 'An error occurred')
 setCalls([])
 } finally {
 setLoading(false)
 }
 }

 fetchCalls()
 }, [userId])

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'pending':
 return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: FaClock }
 case 'dispatched':
 return { label: 'Dispatched', color: 'bg-blue-100 text-blue-800', icon: FaAmbulance }
 case 'on-scene':
 return { label: 'On Scene', color: 'bg-orange-100 text-orange-800', icon: FaMapMarkerAlt }
 case 'completed':
 return { label: 'Completed', color: 'bg-green-100 text-green-800', icon: FaCheckCircle }
 case 'cancelled':
 return { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: FaTimesCircle }
 default:
 return { label: status, color: 'bg-gray-100 text-gray-800', icon: FaClock }
 }
 }

 const filteredCalls = calls.filter((call) => {
 const matchesSearch =
 call.incidentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
 call.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
 (call.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
 const matchesStatus = !statusFilter || call.status === statusFilter
 return matchesSearch && matchesStatus
 })

 return (
 <div className="p-6 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center gap-3 mb-8">
 <FaPhoneAlt className="text-3xl text-red-600" />
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Emergency Calls</h1>
 <p className="text-sm text-gray-500">View and track emergency call records</p>
 </div>
 </div>

 {/* Error Banner */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
 {error}
 </div>
 )}

 {/* Search and Filter */}
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search by incident type, location, or patient..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
 />
 </div>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
 >
 <option value="">All Statuses</option>
 <option value="pending">Pending</option>
 <option value="dispatched">Dispatched</option>
 <option value="on-scene">On Scene</option>
 <option value="completed">Completed</option>
 <option value="cancelled">Cancelled</option>
 </select>
 </div>

 {/* Table */}
 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
 </div>
 ) : filteredCalls.length === 0 ? (
 <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
 <FaAmbulance className="mx-auto text-4xl text-gray-300 mb-4" />
 <h3 className="text-lg font-medium text-gray-600 mb-1">No emergency calls recorded</h3>
 <p className="text-sm text-gray-400">
 {searchTerm || statusFilter
 ? 'Try adjusting your search or filter.'
 : 'Emergency call records will appear here.'}
 </p>
 </div>
 ) : (
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Incident Type
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Location
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Status
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Timestamp
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredCalls.map((call) => {
 const badge = getStatusBadge(call.status)
 const BadgeIcon = badge.icon
 return (
 <tr key={call.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-6 py-4">
 <div className="font-medium text-gray-900">{call.incidentType}</div>
 {call.patientName && (
 <div className="text-sm text-gray-500">{call.patientName}</div>
 )}
 </td>
 <td className="px-6 py-4 text-gray-700">
 <span className="inline-flex items-center gap-1.5">
 <FaMapMarkerAlt className="text-gray-400 text-xs" />
 {call.location}
 </span>
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
 <BadgeIcon className="text-[10px]" />
 {badge.label}
 </span>
 </td>
 <td className="px-6 py-4 text-gray-700 text-sm">
 {new Date(call.timestamp).toLocaleString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 })}
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
