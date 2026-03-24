'use client'

import { useState, useEffect } from 'react'
import {
 FaSpinner, FaCalendarCheck, FaSearch, FaClock,
 FaChild, FaHome, FaVideo, FaHospital, FaUser,
 FaThLarge, FaCalendarAlt, FaCheckCircle, FaTimesCircle,
 FaCheck, FaTimes
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'

interface Booking {
 id: string
 familyName: string
 familyAvatar: string
 scheduledAt: string
 duration: number
 serviceType: string
 type: string
 status: string
 children: string[]
 specialInstructions: string | null
}

type FilterStatus = 'all' | 'pending' | 'upcoming' | 'completed' | 'cancelled'

export default function NannyBookingsPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [bookings, setBookings] = useState<Booking[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [filter, setFilter] = useState<FilterStatus>('all')
 const [searchQuery, setSearchQuery] = useState('')
 const [actionLoading, setActionLoading] = useState<{ id: string; action: 'accept' | 'deny' } | null>(null)

 const handleBookingAction = async (bookingId: string, action: 'accept' | 'deny') => {
 setActionLoading({ id: bookingId, action })
 try {
 const res = await fetch('/api/bookings/action', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ bookingId, bookingType: 'nanny', action }),
 })
 const data = await res.json()
 if (data.success) {
 if (action === 'deny') {
 setBookings(prev => prev.filter(b => b.id !== bookingId))
 } else {
 setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'upcoming' } : b))
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

 useEffect(() => {
 if (!userId) return

 const fetchBookings = async () => {
 try {
 // Fetch pending booking requests
 const reqRes = await fetch(`/api/nannies/${userId}/booking-requests`)
 const reqData = await reqRes.json()
 let allBookings: Booking[] = []

 if (reqData.success && Array.isArray(reqData.data)) {
 allBookings = reqData.data.map((b: {
 id: string
 scheduledAt: string
 duration: number
 type: string
 status: string
 children: string[]
 specialInstructions: string | null
 reason: string | null
 patient?: {
 user: {
 firstName: string
 lastName: string
 profileImage: string | null
 }
 }
 }) => ({
 id: b.id,
 familyName: b.patient?.user
 ? `The ${b.patient.user.lastName} Family`
 : 'Family',
 familyAvatar: b.patient?.user?.profileImage
 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.patient?.user?.lastName || 'F'}`,
 scheduledAt: b.scheduledAt,
 duration: b.duration,
 serviceType: b.reason || b.type || 'Childcare',
 type: b.type,
 status: b.status,
 children: b.children || [],
 specialInstructions: b.specialInstructions,
 }))
 }

 // Also fetch recent bookings from dashboard for a fuller list
 const dashRes = await fetch(`/api/nannies/${userId}/dashboard`)
 if (dashRes.ok) {
 const dashData = await dashRes.json()
 if (dashData.success && dashData.data?.recentBookings?.length) {
 const dashBookings: Booking[] = dashData.data.recentBookings.map((b: {
 id: string
 scheduledAt: string
 duration?: number
 serviceType: string
 status: string
 familyName: string
 familyAvatar: string
 }) => ({
 id: b.id,
 familyName: b.familyName,
 familyAvatar: b.familyAvatar,
 scheduledAt: b.scheduledAt,
 duration: b.duration || 60,
 serviceType: b.serviceType,
 type: 'in_person',
 status: b.status,
 children: [],
 specialInstructions: null,
 }))
 // Merge without duplicates
 const existingIds = new Set(allBookings.map(b => b.id))
 const unique = dashBookings.filter((b: Booking) => !existingIds.has(b.id))
 allBookings = [...allBookings, ...unique]
 }
 }

 setBookings(allBookings)
 } catch (err) {
 console.error('Failed to fetch bookings:', err)
 setError(err instanceof Error ? err.message : 'Failed to load bookings')
 } finally {
 setLoading(false)
 }
 }

 fetchBookings()
 }, [userId])

 const getStatusBadge = (status: string) => {
 const styles: Record<string, string> = {
 pending: 'bg-amber-100 text-amber-700',
 upcoming: 'bg-green-100 text-green-700',
 confirmed: 'bg-green-100 text-green-700',
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

 const filteredBookings = bookings
 .filter(b => {
 if (filter === 'all') return true
 if (filter === 'upcoming') return b.status === 'upcoming' || b.status === 'confirmed'
 return b.status === filter
 })
 .filter(b => {
 if (!searchQuery) return true
 const q = searchQuery.toLowerCase()
 return (
 b.familyName.toLowerCase().includes(q) ||
 b.serviceType.toLowerCase().includes(q) ||
 b.children.some(c => c.toLowerCase().includes(q))
 )
 })
 .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
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
 <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
 <p className="text-gray-500 text-sm mt-1">
 {bookings.length} total booking{bookings.length !== 1 ? 's' : ''}
 </p>
 </div>
 </div>

 {/* Search and Filter */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search by family name or children..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition text-sm"
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
 ? 'bg-purple-600 text-white'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <f.icon className="text-base" />
 </button>
 ))}
 </div>
 </div>

 {/* Bookings List */}
 {filteredBookings.length === 0 ? (
 <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
 <FaCalendarCheck className="text-4xl text-gray-300 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-700 mb-2">
 {filter === 'all' ? 'No Bookings Yet' : `No ${filter} bookings`}
 </h3>
 <p className="text-gray-500 text-sm">
 {filter === 'all'
 ? 'Your bookings will appear here when families request your childcare services.'
 : 'Try a different filter to see other bookings.'}
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {filteredBookings.map((booking) => (
 <div
 key={booking.id}
 className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
 >
 <div className="flex items-start gap-4">
 <img
 src={booking.familyAvatar}
 alt={booking.familyName}
 className="w-12 h-12 rounded-full flex-shrink-0"
 />
 <div className="flex-1 min-w-0">
 <div className="flex items-start justify-between gap-2">
 <div>
 <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center gap-2">
 <FaUser className="text-gray-400 text-xs" />
 {booking.familyName}
 </h3>
 <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
 {getTypeIcon(booking.type)}
 <span className="capitalize">{booking.type.replace(/_/g, ' ')}</span>
 {booking.serviceType && ` — ${booking.serviceType}`}
 </p>
 </div>
 <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${getStatusBadge(booking.status)}`}>
 {booking.status}
 </span>
 </div>

 {booking.children.length > 0 && (
 <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
 <FaChild className="text-purple-400 text-xs" />
 <span>{booking.children.length} child{booking.children.length !== 1 ? 'ren' : ''}: {booking.children.join(', ')}</span>
 </div>
 )}

 <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
 <span className="flex items-center gap-1">
 <FaCalendarCheck className="text-xs text-gray-400" />
 {new Date(booking.scheduledAt).toLocaleDateString('en-US', {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 })}
 </span>
 <span className="flex items-center gap-1">
 <FaClock className="text-xs text-gray-400" />
 {new Date(booking.scheduledAt).toLocaleTimeString('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 })}
 </span>
 {booking.duration && (
 <span className="text-gray-500">{booking.duration} min</span>
 )}
 </div>

 {booking.specialInstructions && (
 <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2">
 <span className="font-medium">Special Instructions:</span> {booking.specialInstructions}
 </p>
 )}

 {booking.status === 'pending' && (
 <div className="flex items-center gap-2 mt-3">
 <button
 onClick={() => handleBookingAction(booking.id, 'accept')}
 disabled={actionLoading?.id === booking.id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
 >
 {actionLoading?.id === booking.id && actionLoading.action === 'accept' ? <FaSpinner className="animate-spin" /> : <FaCheck />}
 Accept
 </button>
 <button
 onClick={() => handleBookingAction(booking.id, 'deny')}
 disabled={actionLoading?.id === booking.id}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
 >
 {actionLoading?.id === booking.id && actionLoading.action === 'deny' ? <FaSpinner className="animate-spin" /> : <FaTimes />}
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
