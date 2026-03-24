'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
 FaSpinner, FaCalendarAlt, FaUsers, FaPrescriptionBottle, FaBriefcaseMedical,
 FaVideo, FaSearch, FaPlus, FaClock, FaCheck, FaTimes,
 FaCheckCircle, FaTimesCircle, FaExclamationTriangle
} from 'react-icons/fa'
import { useDoctorData } from '../context'
import PatientManagement from '../components/PatientManagement'
import PrescriptionSystem from '../components/PrescriptionSystem'
import ServiceCatalogManager from '@/components/shared/ServiceCatalogManager'
import type { ServiceCatalogConfig } from '@/components/shared/ServiceCatalogManager'
import { DOCTOR_SERVICE_CATEGORIES } from '@/lib/validations/service-catalog'

/* ── Tab definitions (5 tabs — requests merged into appointments) ──────────── */

const TABS = [
 { id: 'appointments', label: 'Appointments', icon: FaCalendarAlt },
 { id: 'patients', label: 'Patients', icon: FaUsers },
 { id: 'prescriptions', label: 'Rx', icon: FaPrescriptionBottle },
 { id: 'calendar', label: 'Calendar', icon: FaCalendarAlt },
] as const

type TabId = typeof TABS[number]['id']

/* ── Configs ───────────────────────────────────────────────────────────────── */

const serviceConfig: ServiceCatalogConfig = {
 title: 'My Services',
 apiBasePath: '/api/doctor/services',
 categoryOptions: DOCTOR_SERVICE_CATEGORIES,
 accentColor: 'blue',
 fields: [
 { key: 'serviceName', label: 'Service Name', type: 'text', required: true, placeholder: 'e.g. General Consultation' },
 { key: 'category', label: 'Category', type: 'select', required: true, options: DOCTOR_SERVICE_CATEGORIES },
 { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the service...' },
 { key: 'price', label: 'Price (MUR)', type: 'number', required: true, placeholder: '0' },
 { key: 'duration', label: 'Duration (minutes)', type: 'number', placeholder: '30', defaultValue: 30 },
 { key: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
 ],
}

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface MappedAppointment {
 id: string
 patientName: string
 status: string
 type: string
 date: string
 time: string
 duration: number
 reason: string
 roomId?: string
 location?: string
 notes?: string
 bookingType?: string // for pending request actions
}

interface ApiAppointment {
 id: string
 patient?: { user: { firstName: string; lastName: string } }
 status: string
 type?: string
 scheduledAt: string
 duration?: number
 reason?: string
 roomId?: string
 location?: string
 notes?: string
}

interface ApiPatient {
 id: string
 userId?: string
 firstName: string
 lastName: string
 email?: string
 phone?: string
 bloodType?: string
 chronicConditions?: string[]
 allergies?: string[]
 appointmentCount?: number
 lastVisit?: string
 gender?: string
 dateOfBirth?: string
}

/* ── Status helpers ────────────────────────────────────────────────────────── */

function getStatusBadge(status: string, date: string) {
 const aptDate = new Date(date)
 const today = new Date()
 const isToday = aptDate.toDateString() === today.toDateString()

 if (status === 'pending') return { label: 'Pending', color: 'bg-orange-100 text-orange-800', icon: FaClock }
 if (status === 'scheduled' || status === 'upcoming') {
 if (isToday) return { label: 'Today', color: 'bg-blue-100 text-blue-800', icon: FaClock }
 return { label: 'Upcoming', color: 'bg-green-100 text-green-800', icon: FaCheckCircle }
 }
 if (status === 'completed') return { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: FaCheckCircle }
 if (status === 'cancelled') return { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: FaTimesCircle }
 if (status === 'no-show') return { label: 'No Show', color: 'bg-yellow-100 text-yellow-800', icon: FaExclamationTriangle }
 return { label: status, color: 'bg-gray-100 text-gray-600', icon: FaClock }
}

function getTypeBadge(type: string) {
 if (type === 'video') return { label: 'Video', color: 'text-green-600' }
 if (type === 'home-visit') return { label: 'Home', color: 'text-teal-600' }
 return { label: 'In-Person', color: 'text-blue-600' }
}

/* ── Main Component ────────────────────────────────────────────────────────── */

export default function DoctorPracticePage() {
 const user = useDoctorData()
 const router = useRouter()
 const searchParams = useSearchParams()
 const rawTab = searchParams.get('tab')
 // Map ?tab=requests to appointments (requests merged into appointments)
 const effectiveTab = rawTab === 'requests' ? 'appointments' : rawTab
 const isRequestsTab = rawTab === 'requests'
 const validTabs: TabId[] = ['appointments', 'patients', 'prescriptions', 'calendar']
 const [activeTab, setActiveTab] = useState<TabId>(effectiveTab && validTabs.includes(effectiveTab as TabId) ? effectiveTab as TabId : 'appointments')
 const [loading, setLoading] = useState(true)

 // Sync activeTab when ?tab= query param changes (e.g. notification click)
 // Also auto-filter to pending when navigating from a booking request notification
 useEffect(() => {
 const mapped = rawTab === 'requests' ? 'appointments' : rawTab
 if (mapped && validTabs.includes(mapped as TabId)) {
 setActiveTab(mapped as TabId)
 }
 if (rawTab === 'requests') {
 setStatusFilter('pending')
 }
 }, [rawTab])

 // Appointment data
 const [allAppointments, setAllAppointments] = useState<MappedAppointment[]>([])
 const [searchQuery, setSearchQuery] = useState('')
 const [statusFilter, setStatusFilter] = useState('')
 const [actionLoading, setActionLoading] = useState<{ id: string; action: 'accept' | 'deny' } | null>(null)

 // Patient data
 const [patientData, setPatientData] = useState<any>(null)

 // Prescription data
 const [prescriptions, setPrescriptions] = useState<any[]>([])
 const [patientsList, setPatientsList] = useState<any[]>([])

 const preselectedPatientId = searchParams.get('patientId') || ''

 const mapAppointment = (apt: ApiAppointment): MappedAppointment => ({
 id: apt.id,
 patientName: apt.patient ? `${apt.patient.user.firstName} ${apt.patient.user.lastName}` : 'Unknown',
 status: apt.status === 'upcoming' ? 'scheduled' : apt.status,
 type: (apt.type || '').replace(/_/g, '-') || 'in-person',
 date: apt.scheduledAt,
 time: new Date(apt.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
 duration: apt.duration || 30,
 reason: apt.reason || '',
 roomId: apt.roomId,
 location: apt.location,
 notes: apt.notes,
 })

 const fetchAll = useCallback(async () => {
 try {
 const [upcomingRes, pastRes, pendingRes, patientRes, prescRes] = await Promise.all([
 fetch(`/api/doctors/${user.id}/appointments?status=upcoming`),
 fetch(`/api/doctors/${user.id}/appointments?status=completed`),
 fetch(`/api/doctors/${user.id}/booking-requests`),
 fetch(`/api/doctors/${user.id}/patients`),
 fetch(`/api/doctors/${user.id}/prescriptions`),
 ])
 const [upcoming, past, pending, patientJson, prescJson] = await Promise.all([
 upcomingRes.json(), pastRes.json(), pendingRes.json(), patientRes.json(), prescRes.json(),
 ])

 // Map pending booking requests into the same shape
 const pendingMapped: MappedAppointment[] = (pending.data || []).map((apt: ApiAppointment) => ({
 ...mapAppointment(apt),
 status: 'pending',
 bookingType: 'doctor',
 }))

 // Merge all, dedup by id
 const seen = new Set<string>()
 const all = [
 ...pendingMapped,
 ...(upcoming.data || []).map(mapAppointment),
 ...(past.data || []).map(mapAppointment),
 ].filter(a => {
 if (seen.has(a.id)) return false
 seen.add(a.id)
 return true
 })
 setAllAppointments(all)

 if (patientJson.success) {
 const mapped = patientJson.data.map((p: ApiPatient) => ({
 id: p.id, userId: p.userId, firstName: p.firstName, lastName: p.lastName,
 email: p.email || '', phone: p.phone || '', status: 'active' as const,
 bloodType: p.bloodType, chronicConditions: p.chronicConditions,
 allergies: p.allergies, totalVisits: p.appointmentCount,
 lastVisit: p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : undefined,
 gender: p.gender, dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : undefined,
 }))
 setPatientData({
 statistics: { totalPatients: mapped.length, activePatients: mapped.length, newPatientsThisMonth: 0 },
 patients: { current: mapped, past: [] },
 })
 setPatientsList(patientJson.data.map((p: ApiPatient) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName })))
 }

 if (prescJson.success) setPrescriptions(prescJson.data)
 } catch (error) {
 console.error('Failed to fetch practice data:', error)
 } finally {
 setLoading(false)
 }
 }, [user.id])

 useEffect(() => { fetchAll() }, [fetchAll])

 // Filtered & sorted appointments
 const filteredAppointments = useMemo(() => {
 let list = allAppointments
 if (statusFilter) {
 if (statusFilter === 'today') {
 const todayStr = new Date().toDateString()
 list = list.filter(a => new Date(a.date).toDateString() === todayStr)
 } else {
 list = list.filter(a => a.status === statusFilter)
 }
 }
 if (searchQuery) {
 const q = searchQuery.toLowerCase()
 list = list.filter(a =>
 a.patientName.toLowerCase().includes(q) ||
 a.reason.toLowerCase().includes(q) ||
 a.type.toLowerCase().includes(q)
 )
 }
 // Sort: pending first, then today, then upcoming by date, then past
 return list.sort((a, b) => {
 const aPending = a.status === 'pending' ? 0 : 1
 const bPending = b.status === 'pending' ? 0 : 1
 if (aPending !== bPending) return aPending - bPending

 const now = Date.now()
 const aTime = new Date(a.date).getTime()
 const bTime = new Date(b.date).getTime()
 const aUpcoming = aTime >= now ? 0 : 1
 const bUpcoming = bTime >= now ? 0 : 1
 if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming
 return aUpcoming === 0 ? aTime - bTime : bTime - aTime
 })
 }, [allAppointments, statusFilter, searchQuery])

 // Stats
 const pendingCount = allAppointments.filter(a => a.status === 'pending').length
 const todayCount = useMemo(() => {
 const todayStr = new Date().toDateString()
 return allAppointments.filter(a => new Date(a.date).toDateString() === todayStr && a.status !== 'cancelled' && a.status !== 'pending').length
 }, [allAppointments])
 const upcomingCount = allAppointments.filter(a => a.status === 'scheduled' || a.status === 'upcoming').length
 const completedCount = allAppointments.filter(a => a.status === 'completed').length

 const handleBookingAction = async (bookingId: string, action: 'accept' | 'deny', bookingType: string) => {
 setActionLoading({ id: bookingId, action })
 try {
 const res = await fetch('/api/bookings/action', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ bookingId, bookingType, action }),
 })
 const data = await res.json()
 if (data.success) {
 // Refresh all data so the appointment moves from pending to upcoming (or is removed)
 await fetchAll()
 } else {
 alert(data.message || 'Action failed')
 }
 } catch {
 alert('Something went wrong')
 } finally {
 setActionLoading(null)
 }
 }

 const handleCreatePrescription = async (data: any) => {
 const res = await fetch(`/api/doctors/${user.id}/prescriptions`, {
 method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
 })
 const json = await res.json()
 if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create prescription')
 await fetchAll()
 }

 const handlePatientVideoCall = async () => {
 try {
 const res = await fetch('/api/video/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creatorId: user.id }) })
 const data = await res.json()
 if (data.roomId) router.push(`/doctor/video?roomId=${data.roomId}`)
 } catch { router.push('/doctor/video') }
 }

 const handlePrescribe = () => { setActiveTab('prescriptions') }

 const handleMessage = async (userId: string) => {
 try {
 const res = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantIds: [userId] }) })
 const data = await res.json()
 router.push(data.id ? `/doctor/messages?conversationId=${data.id}` : '/doctor/messages')
 } catch { router.push('/doctor/messages') }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center py-20">
 <FaSpinner className="animate-spin text-3xl text-blue-600" />
 </div>
 )
 }

 return (
 <div className="pb-20 sm:pb-0">
 {/* Desktop tab bar */}
 <div className="hidden sm:block border-b border-gray-200 bg-white rounded-t-xl">
 <div className="flex overflow-x-auto">
 {TABS.map((tab) => {
 const Icon = tab.icon
 const isActive = activeTab === tab.id
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
 isActive
 ? 'border-blue-600 text-blue-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 <Icon className={isActive ? 'text-blue-600' : 'text-gray-400'} />
 {tab.label}
 </button>
 )
 })}
 </div>
 </div>

 {/* ── Appointments Tab (unified table) ─────────────────────────────────── */}
 {activeTab === 'appointments' && (
 <div className="p-4 sm:p-6">
 {/* Stats row */}
 <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6">
 <button onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
 className={`rounded-xl p-3 sm:p-4 border transition-all text-left ${statusFilter === 'pending' ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-400' : 'border-gray-200 bg-white hover:border-orange-200'}`}>
 <p className="text-xs text-gray-500 font-medium">Pending</p>
 <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
 </button>
 <button onClick={() => setStatusFilter(statusFilter === 'today' ? '' : 'today')}
 className={`rounded-xl p-3 sm:p-4 border transition-all text-left ${statusFilter === 'today' ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400' : 'border-gray-200 bg-white hover:border-blue-200'}`}>
 <p className="text-xs text-gray-500 font-medium">Today</p>
 <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
 </button>
 <button onClick={() => setStatusFilter(statusFilter === 'scheduled' ? '' : 'scheduled')}
 className={`rounded-xl p-3 sm:p-4 border transition-all text-left ${statusFilter === 'scheduled' ? 'border-green-400 bg-green-50 ring-1 ring-green-400' : 'border-gray-200 bg-white hover:border-green-200'}`}>
 <p className="text-xs text-gray-500 font-medium">Upcoming</p>
 <p className="text-2xl font-bold text-green-600">{upcomingCount}</p>
 </button>
 <button onClick={() => setStatusFilter(statusFilter === 'completed' ? '' : 'completed')}
 className={`rounded-xl p-3 sm:p-4 border transition-all text-left ${statusFilter === 'completed' ? 'border-gray-400 bg-gray-50 ring-1 ring-gray-400' : 'border-gray-200 bg-white hover:border-gray-200'}`}>
 <p className="text-xs text-gray-500 font-medium">Completed</p>
 <p className="text-2xl font-bold text-gray-600">{completedCount}</p>
 </button>
 </div>

 {/* Search + filter + schedule button */}
 <div className="flex flex-col sm:flex-row gap-3 mb-4">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input type="text" placeholder="Search patient, reason..."
 value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
 </div>
 <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
 <option value="">All Status</option>
 <option value="pending">Pending</option>
 <option value="today">Today</option>
 <option value="scheduled">Upcoming</option>
 <option value="completed">Completed</option>
 <option value="cancelled">Cancelled</option>
 <option value="no-show">No Show</option>
 </select>
 <button onClick={() => setActiveTab('calendar')}
 className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap">
 <FaPlus className="text-sm" /> Schedule New
 </button>
 </div>

 {/* Appointments table */}
 {filteredAppointments.length === 0 ? (
 <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
 <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-3" />
 <p className="text-gray-500 font-medium">No appointments found</p>
 <p className="text-gray-400 text-sm mt-1">
 {searchQuery || statusFilter ? 'Try adjusting your search or filter.' : 'Your appointment list will appear here.'}
 </p>
 </div>
 ) : (
 <>
 {/* Desktop table */}
 <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
 <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date & Time</th>
 <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
 <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
 <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
 <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
 <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredAppointments.map((apt) => {
 const badge = getStatusBadge(apt.status, apt.date)
 const BadgeIcon = badge.icon
 const typeBadge = getTypeBadge(apt.type)
 const dateStr = new Date(apt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
 return (
 <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-4 py-3">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
 {apt.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <span className="font-medium text-gray-900 text-sm">{apt.patientName}</span>
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-gray-700">
 <div>{dateStr}</div>
 <div className="text-xs text-gray-400">{apt.time}</div>
 </td>
 <td className="px-4 py-3">
 <span className={`text-xs font-medium ${typeBadge.color}`}>{typeBadge.label}</span>
 </td>
 <td className="px-4 py-3">
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
 <BadgeIcon className="text-[10px]" /> {badge.label}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{apt.reason || '—'}</td>
 <td className="px-4 py-3 text-sm text-gray-600">{apt.duration} min</td>
 <td className="px-4 py-3 text-right">
 {apt.status === 'pending' && apt.bookingType ? (
 <div className="flex items-center justify-end gap-1">
 <button
 onClick={() => handleBookingAction(apt.id, 'accept', apt.bookingType!)}
 disabled={actionLoading?.id === apt.id}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
 >
 {actionLoading?.id === apt.id && actionLoading.action === 'accept' ? <FaSpinner className="animate-spin text-[10px]" /> : <FaCheck className="text-[10px]" />}
 Accept
 </button>
 <button
 onClick={() => handleBookingAction(apt.id, 'deny', apt.bookingType!)}
 disabled={actionLoading?.id === apt.id}
 className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
 >
 {actionLoading?.id === apt.id && actionLoading.action === 'deny' ? <FaSpinner className="animate-spin text-[10px]" /> : <FaTimes className="text-[10px]" />}
 Decline
 </button>
 </div>
 ) : (apt.status === 'scheduled' || apt.status === 'upcoming') && apt.type === 'video' ? (
 <button onClick={() => {
 if (apt.roomId) router.push(`/doctor/video?roomId=${apt.roomId}`)
 else router.push('/doctor/video')
 }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Start Video Call">
 <FaVideo />
 </button>
 ) : null}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>

 {/* Mobile cards */}
 <div className="sm:hidden space-y-3">
 {filteredAppointments.map((apt) => {
 const badge = getStatusBadge(apt.status, apt.date)
 const BadgeIcon = badge.icon
 const typeBadge = getTypeBadge(apt.type)
 const dateStr = new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
 return (
 <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
 {apt.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
 </div>
 <span className="font-semibold text-gray-900 text-sm">{apt.patientName}</span>
 </div>
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
 <BadgeIcon className="text-[10px]" /> {badge.label}
 </span>
 </div>
 <div className="flex items-center gap-4 text-xs text-gray-500 mb-1">
 <span className="flex items-center gap-1"><FaClock className="text-[10px]" /> {dateStr} {apt.time}</span>
 <span className={`font-medium ${typeBadge.color}`}>{typeBadge.label}</span>
 <span>{apt.duration} min</span>
 </div>
 {apt.reason && <p className="text-xs text-gray-500 truncate">{apt.reason}</p>}
 {apt.status === 'pending' && apt.bookingType ? (
 <div className="flex items-center gap-2 mt-2">
 <button
 onClick={() => handleBookingAction(apt.id, 'accept', apt.bookingType!)}
 disabled={actionLoading?.id === apt.id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
 >
 {actionLoading?.id === apt.id && actionLoading.action === 'accept' ? <FaSpinner className="animate-spin" /> : <FaCheck />}
 Accept
 </button>
 <button
 onClick={() => handleBookingAction(apt.id, 'deny', apt.bookingType!)}
 disabled={actionLoading?.id === apt.id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
 >
 {actionLoading?.id === apt.id && actionLoading.action === 'deny' ? <FaSpinner className="animate-spin" /> : <FaTimes />}
 Decline
 </button>
 </div>
 ) : (apt.status === 'scheduled' || apt.status === 'upcoming') && apt.type === 'video' ? (
 <button onClick={() => {
 if (apt.roomId) router.push(`/doctor/video?roomId=${apt.roomId}`)
 else router.push('/doctor/video')
 }} className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
 <FaVideo /> Join Video Call
 </button>
 ) : null}
 </div>
 )
 })}
 </div>
 </>
 )}
 </div>
 )}

 {/* ── Calendar Tab ──────────────────────────────────────────────────────── */}
 {activeTab === 'calendar' && (
 <div className="p-4 sm:p-6">
 <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
 <FaCalendarAlt className="mx-auto text-4xl text-blue-400 mb-3" />
 <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule & Calendar</h3>
 <p className="text-gray-500 text-sm mb-4">Select a date and time to schedule a new appointment</p>
 <div className="max-w-md mx-auto space-y-4">
 <input type="date" min={new Date().toISOString().split('T')[0]}
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
 <input type="time"
 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
 <p className="text-xs text-gray-400">Full calendar view coming soon</p>
 </div>
 </div>
 </div>
 )}

 {/* ── Other Tabs ────────────────────────────────────────────────────────── */}
 {activeTab === 'patients' && patientData && (
 <PatientManagement
 doctorData={patientData}
 onVideoCall={handlePatientVideoCall}
 onPrescribe={handlePrescribe}
 onMessage={handleMessage}
 />
 )}
 {activeTab === 'prescriptions' && (
 <PrescriptionSystem
 doctorData={{
 firstName: user.firstName, lastName: user.lastName,
 prescriptions, prescriptionTemplates: [],
 patients: { current: patientsList },
 }}
 onCreatePrescription={handleCreatePrescription}
 preselectedPatientId={preselectedPatientId}
 />
 )}

 {/* Mobile bottom tab bar */}
 <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50 shadow-lg">
 {TABS.map((tab) => {
 const Icon = tab.icon
 const isActive = activeTab === tab.id
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex flex-col items-center justify-center p-1 min-w-[40px] ${
 isActive ? 'text-blue-600' : 'text-gray-400'
 }`}
 >
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 <span className="text-[10px] mt-0.5">{tab.label}</span>
 {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />}
 </button>
 )
 })}
 </div>
 </div>
 )
}
