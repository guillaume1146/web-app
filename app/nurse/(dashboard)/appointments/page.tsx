'use client'

import { useState, useEffect } from 'react'
import {
 FaSpinner, FaCalendarCheck, FaSearch,
 FaClock, FaUser, FaVideo, FaHome, FaHospital,
 FaThLarge, FaCalendarAlt, FaCheckCircle, FaTimesCircle,
 FaCheck, FaTimes
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'

interface Appointment {
 id: string
 patientName: string
 patientAvatar: string
 scheduledAt: string
 duration: number
 serviceType: string
 type: string
 status: string
 reason: string | null
}

type FilterStatus = 'all' | 'pending' | 'upcoming' | 'completed' | 'cancelled'

export default function NurseAppointmentsPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [appointments, setAppointments] = useState<Appointment[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [filter, setFilter] = useState<FilterStatus>('all')
 const [searchQuery, setSearchQuery] = useState('')
 const [actionLoading, setActionLoading] = useState<{ id: string; action: 'accept' | 'deny' } | null>(null)

 useEffect(() => {
 if (!userId) return

 const fetchAppointments = async () => {
 try {
 const res = await fetch(`/api/nurses/${userId}/booking-requests`)
 const data = await res.json()
 if (data.success && Array.isArray(data.data)) {
 const mapped: Appointment[] = data.data.map((b: {
 id: string
 scheduledAt: string
 duration: number
 type: string
 status: string
 reason: string | null
 notes: string | null
 patient?: {
 user: {
 firstName: string
 lastName: string
 profileImage: string | null
 }
 }
 }) => ({
 id: b.id,
 patientName: b.patient?.user
 ? `${b.patient.user.firstName} ${b.patient.user.lastName}`
 : 'Patient',
 patientAvatar: b.patient?.user?.profileImage
 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.patient?.user?.firstName || 'P'}`,
 scheduledAt: b.scheduledAt,
 duration: b.duration,
 serviceType: b.reason || b.type || 'Nursing Service',
 type: b.type,
 status: b.status,
 reason: b.reason,
 }))
 setAppointments(mapped)
 }

 // Also fetch all bookings from dashboard for a fuller list
 const dashRes = await fetch(`/api/nurses/${userId}/dashboard`)
 if (dashRes.ok) {
 const dashData = await dashRes.json()
 if (dashData.success && dashData.data?.recentBookings?.length) {
 const dashBookings: Appointment[] = dashData.data.recentBookings.map((b: {
 id: string
 scheduledAt: string
 duration?: number
 serviceType: string
 status: string
 patientName: string
 patientAvatar: string
 }) => ({
 id: b.id,
 patientName: b.patientName,
 patientAvatar: b.patientAvatar,
 scheduledAt: b.scheduledAt,
 duration: b.duration || 30,
 serviceType: b.serviceType,
 type: 'in_person',
 status: b.status,
 reason: null,
 }))
 // Merge without duplicates
 setAppointments(prev => {
 const existingIds = new Set(prev.map(a => a.id))
 const unique = dashBookings.filter((b: Appointment) => !existingIds.has(b.id))
 return [...prev, ...unique]
 })
 }
 }
 } catch (err) {
 console.error('Failed to fetch appointments:', err)
 setError(err instanceof Error ? err.message : 'Failed to load appointments')
 } finally {
 setLoading(false)
 }
 }

 fetchAppointments()
 }, [userId])

 const handleBookingAction = async (bookingId: string, action: 'accept' | 'deny') => {
 setActionLoading({ id: bookingId, action })
 try {
 const res = await fetch('/api/bookings/action', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ bookingId, bookingType: 'nurse', action }),
 })
 const data = await res.json()
 if (data.success) {
 // Update locally: remove or change status
 if (action === 'deny') {
 setAppointments(prev => prev.filter(a => a.id !== bookingId))
 } else {
 setAppointments(prev => prev.map(a => a.id === bookingId ? { ...a, status: 'upcoming' } : a))
 }
 } else {
 alert(data.message || 'Action failed')
 }
 } catch {
 alert('Something went wrong')
 } finally {
 setActionLoading(null)
 }
 }

 const getStatusBadge = (status: string) => {
 const styles: Record<string, string> = {
 pending: 'bg-amber-100 text-amber-700',
 upcoming: 'bg-green-100 text-green-700',
 completed: 'bg-blue-100 text-blue-700',
 cancelled: 'bg-red-100 text-red-700',
 }
 return styles[status] || 'bg-gray-100 text-gray-700'
 }

 const getTypeIcon = (type: string) => {
 switch (type) {
 case 'video': return <FaVideo className="text-blue-500" />
 case 'home_visit': return <FaHome className="text-purple-500" />
 case 'in_person': return <FaHospital className="text-green-500" />
 default: return <FaCalendarCheck className="text-gray-500" />
 }
 }

 const filteredAppointments = appointments
 .filter(a => {
 if (filter === 'all') return true
 return a.status === filter
 })
 .filter(a => {
 if (!searchQuery) return true
 const q = searchQuery.toLowerCase()
 return (
 a.patientName.toLowerCase().includes(q) ||
 a.serviceType.toLowerCase().includes(q) ||
 a.type.toLowerCase().includes(q)
 )
 })
 .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
 </div>
 )
 }

 return (
 <div className="space-y-6">
 {/* Error State */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
 <FaTimesCircle />
 </button>
 </div>
 )}

 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
 <p className="text-gray-500 text-sm mt-1">
 {appointments.length} total appointment{appointments.length !== 1 ? 's' : ''}
 </p>
 </div>
 </div>

 {/* Search and Filter */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search by patient name or service..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition text-sm"
 />
 </div>
 <div className="flex gap-2 flex-wrap">
 {([
 { key: 'all' as FilterStatus, icon: FaThLarge, label: 'All' },
 { key: 'pending' as FilterStatus, icon: FaClock, label: 'Pending' },
 { key: 'upcoming' as FilterStatus, icon: FaCalendarAlt, label: 'Upcoming' },
 { key: 'completed' as FilterStatus, icon: FaCheckCircle, label: 'Completed' },
 { key: 'cancelled' as FilterStatus, icon: FaTimesCircle, label: 'Cancelled' },
 ]).map((f) => (
 <button
 key={f.key}
 onClick={() => setFilter(f.key)}
 title={f.label}
 aria-label={f.label}
 className={`p-2.5 rounded-lg text-sm font-medium transition ${
 filter === f.key
 ? 'bg-teal-600 text-white'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <f.icon className="text-base" />
 </button>
 ))}
 </div>
 </div>

 {/* Appointments List */}
 {filteredAppointments.length === 0 ? (
 <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
 <FaCalendarCheck className="text-4xl text-gray-300 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-700 mb-2">
 {filter === 'all' ? 'No Appointments Yet' : `No ${filter} appointments`}
 </h3>
 <p className="text-gray-500 text-sm">
 {filter === 'all'
 ? 'Your appointments will appear here when patients book your services.'
 : 'Try a different filter to see other appointments.'}
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {filteredAppointments.map((apt) => (
 <div
 key={apt.id}
 className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
 >
 <div className="flex items-start gap-4">
 <img
 src={apt.patientAvatar}
 alt={apt.patientName}
 className="w-12 h-12 rounded-full flex-shrink-0"
 />
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-2">
 <div>
 <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2">
 <FaUser className="text-gray-400 text-xs" />
 {apt.patientName}
 </h3>
 <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
 {getTypeIcon(apt.type)}
 <span className="capitalize">{apt.type.replace(/_/g, ' ')}</span>
 {apt.serviceType && ` — ${apt.serviceType}`}
 </p>
 </div>
 <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(apt.status)}`}>
 {apt.status}
 </span>
 </div>
 <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
 <span className="flex items-center gap-1">
 <FaCalendarCheck className="text-xs text-gray-400" />
 {new Date(apt.scheduledAt).toLocaleDateString('en-US', {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 })}
 </span>
 <span className="flex items-center gap-1">
 <FaClock className="text-xs text-gray-400" />
 {new Date(apt.scheduledAt).toLocaleTimeString('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 })}
 </span>
 {apt.duration && (
 <span className="text-gray-500">{apt.duration} min</span>
 )}
 </div>
 {apt.status === 'pending' && (
 <div className="flex items-center gap-2 mt-3">
 <button
 onClick={() => handleBookingAction(apt.id, 'accept')}
 disabled={actionLoading?.id === apt.id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
 >
 {actionLoading?.id === apt.id && actionLoading.action === 'accept' ? <FaSpinner className="animate-spin" /> : <FaCheck />}
 Accept
 </button>
 <button
 onClick={() => handleBookingAction(apt.id, 'deny')}
 disabled={actionLoading?.id === apt.id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
 >
 {actionLoading?.id === apt.id && actionLoading.action === 'deny' ? <FaSpinner className="animate-spin" /> : <FaTimes />}
 Decline
 </button>
 </div>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )
}
