'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import {
 FaSpinner, FaUsers, FaSearch, FaEnvelope, FaPhone,
 FaCalendarCheck, FaCheckCircle, FaClock, FaThLarge,
 FaHistory, FaTimesCircle
} from 'react-icons/fa'

interface Patient {
 id: string
 firstName: string
 lastName: string
 email: string
 phone: string
 profileImage: string | null
 bookingCount: number
 lastBookingDate: string | null
 hasActiveBooking: boolean
}

export default function NursePatientsPage() {
 const { user: hookUser } = useUser()
 const [userId, setUserId] = useState('')
 const [patients, setPatients] = useState<Patient[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [searchQuery, setSearchQuery] = useState('')
 const [filterActive, setFilterActive] = useState<'all' | 'active' | 'past'>('all')

 useEffect(() => {
 if (hookUser?.id) setUserId(hookUser.id)
 }, [hookUser])

 useEffect(() => {
 if (!userId) return

 const fetchPatients = async () => {
 try {
 const [dashRes, reqRes] = await Promise.all([
 fetch(`/api/nurses/${userId}/dashboard`),
 fetch(`/api/nurses/${userId}/booking-requests`),
 ])

 const patientMap = new Map<string, Patient>()

 if (reqRes.ok) {
 const reqData = await reqRes.json()
 if (reqData.success && Array.isArray(reqData.data)) {
 for (const b of reqData.data) {
 const user = b.patient?.user
 if (!user) continue
 const key = user.id || b.patient?.id

 if (!patientMap.has(key)) {
 patientMap.set(key, {
 id: key,
 firstName: user.firstName || '',
 lastName: user.lastName || '',
 email: user.email || '',
 phone: user.phone || '',
 profileImage: user.profileImage || null,
 bookingCount: 1,
 lastBookingDate: b.scheduledAt,
 hasActiveBooking: ['pending', 'upcoming', 'confirmed'].includes(b.status),
 })
 } else {
 const existing = patientMap.get(key)!
 existing.bookingCount++
 if (['pending', 'upcoming', 'confirmed'].includes(b.status)) {
 existing.hasActiveBooking = true
 }
 if (b.scheduledAt && (!existing.lastBookingDate || new Date(b.scheduledAt) > new Date(existing.lastBookingDate))) {
 existing.lastBookingDate = b.scheduledAt
 }
 }
 }
 }
 }

 if (dashRes.ok) {
 const dashData = await dashRes.json()
 if (dashData.success && dashData.data?.recentBookings) {
 for (const b of dashData.data.recentBookings) {
 const key = b.patientName || b.id
 if (!patientMap.has(key)) {
 const [first, ...rest] = (b.patientName || 'Unknown').split(' ')
 patientMap.set(key, {
 id: b.id,
 firstName: first,
 lastName: rest.join(' '),
 email: '',
 phone: '',
 profileImage: b.patientAvatar || null,
 bookingCount: 1,
 lastBookingDate: b.scheduledAt,
 hasActiveBooking: ['pending', 'upcoming', 'confirmed'].includes(b.status),
 })
 }
 }
 }
 }

 setPatients(Array.from(patientMap.values()))
 } catch (err) {
 console.error('Failed to fetch patients:', err)
 setError(err instanceof Error ? err.message : 'Failed to load patients')
 } finally {
 setLoading(false)
 }
 }

 fetchPatients()
 }, [userId])

 const filteredPatients = patients
 .filter(p => {
 if (filterActive === 'active') return p.hasActiveBooking
 if (filterActive === 'past') return !p.hasActiveBooking
 return true
 })
 .filter(p => {
 if (!searchQuery) return true
 const q = searchQuery.toLowerCase()
 return (
 p.firstName.toLowerCase().includes(q) ||
 p.lastName.toLowerCase().includes(q) ||
 p.email.toLowerCase().includes(q)
 )
 })
 .sort((a, b) => {
 if (a.hasActiveBooking !== b.hasActiveBooking) return a.hasActiveBooking ? -1 : 1
 const dateA = a.lastBookingDate ? new Date(a.lastBookingDate).getTime() : 0
 const dateB = b.lastBookingDate ? new Date(b.lastBookingDate).getTime() : 0
 return dateB - dateA
 })

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <FaSpinner className="animate-spin text-3xl text-teal-600" />
 </div>
 )
 }

 return (
 <div className="space-y-6">
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
 <FaTimesCircle />
 </button>
 </div>
 )}

 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
 <p className="text-gray-500 text-sm mt-1">
 {patients.length} patient{patients.length !== 1 ? 's' : ''} treated
 </p>
 </div>
 </div>

 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search patients..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition text-sm"
 />
 </div>
 <div className="flex gap-2">
 {([
 { key: 'all' as const, icon: FaThLarge, label: 'All' },
 { key: 'active' as const, icon: FaCheckCircle, label: 'Active' },
 { key: 'past' as const, icon: FaHistory, label: 'Past' },
 ]).map((f) => (
 <button
 key={f.key}
 onClick={() => setFilterActive(f.key)}
 title={f.label}
 aria-label={f.label}
 className={`p-2.5 rounded-lg text-sm font-medium transition ${
 filterActive === f.key
 ? 'bg-teal-600 text-white'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <f.icon className="text-base" />
 </button>
 ))}
 </div>
 </div>

 {filteredPatients.length === 0 ? (
 <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
 <FaUsers className="text-4xl text-gray-300 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-700 mb-2">
 {patients.length === 0 ? 'No Patients Yet' : 'No matching patients'}
 </h3>
 <p className="text-gray-500 text-sm">
 {patients.length === 0
 ? 'Patients you care for will appear here once you start accepting bookings.'
 : 'Try adjusting your search or filter criteria.'}
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredPatients.map((patient) => (
 <div
 key={patient.id}
 className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
 >
 <div className="flex items-start gap-4">
 {patient.profileImage ? (
 <img src={patient.profileImage} alt="" className="w-14 h-14 rounded-full flex-shrink-0" />
 ) : (
 <div className="w-14 h-14 bg-brand-teal rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
 {patient.firstName.charAt(0)}{patient.lastName.charAt(0)}
 </div>
 )}
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2 mb-1">
 <h3 className="font-semibold text-gray-900 text-base truncate">
 {patient.firstName} {patient.lastName}
 </h3>
 {patient.hasActiveBooking && (
 <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
 <FaCheckCircle className="text-green-500" />
 Active
 </span>
 )}
 </div>

 <div className="space-y-1 mb-3">
 {patient.email && (
 <p className="text-xs text-gray-500 flex items-center gap-2">
 <FaEnvelope className="text-gray-400" /> {patient.email}
 </p>
 )}
 {patient.phone && (
 <p className="text-xs text-gray-500 flex items-center gap-2">
 <FaPhone className="text-gray-400" /> {patient.phone}
 </p>
 )}
 </div>

 <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
 <span className="flex items-center gap-1">
 <FaCalendarCheck className="text-gray-400" />
 {patient.bookingCount} booking{patient.bookingCount !== 1 ? 's' : ''}
 </span>
 {patient.lastBookingDate && (
 <span className="flex items-center gap-1">
 <FaClock className="text-gray-400" />
 Last: {new Date(patient.lastBookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
 </span>
 )}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )
}
