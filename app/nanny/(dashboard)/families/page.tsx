'use client'

import { useState, useEffect } from 'react'
import {
 FaSpinner, FaUserFriends, FaSearch, FaChild,
 FaEnvelope, FaPhone, FaCalendarCheck, FaCheckCircle,
 FaClock, FaThLarge, FaHistory, FaTimesCircle
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'

interface Family {
 id: string
 familyName: string
 parentFirstName: string
 parentLastName: string
 email: string
 phone: string
 profileImage: string | null
 children: string[]
 bookingCount: number
 lastBookingDate: string | null
 hasActiveBooking: boolean
}

export default function NannyFamiliesPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [families, setFamilies] = useState<Family[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [searchQuery, setSearchQuery] = useState('')
 const [filterActive, setFilterActive] = useState<'all' | 'active' | 'past'>('all')

 useEffect(() => {
 if (!userId) return

 const fetchFamilies = async () => {
 try {
 // Fetch all bookings from dashboard and booking-requests to build a family list
 const [dashRes, reqRes] = await Promise.all([
 fetch(`/api/nannies/${userId}/dashboard`),
 fetch(`/api/nannies/${userId}/booking-requests`),
 ])

 const familyMap = new Map<string, Family>()

 // Process dashboard bookings
 if (dashRes.ok) {
 const dashData = await dashRes.json()
 if (dashData.success && dashData.data?.recentBookings) {
 for (const b of dashData.data.recentBookings) {
 // Each booking has a family; use the familyName as a rough key
 const key = b.familyName || b.id
 if (!familyMap.has(key)) {
 familyMap.set(key, {
 id: b.id,
 familyName: b.familyName || 'Unknown Family',
 parentFirstName: '',
 parentLastName: '',
 email: '',
 phone: '',
 profileImage: b.familyAvatar || null,
 children: [],
 bookingCount: 1,
 lastBookingDate: b.scheduledAt,
 hasActiveBooking: b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'pending',
 })
 } else {
 const existing = familyMap.get(key)!
 existing.bookingCount++
 if (b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'pending') {
 existing.hasActiveBooking = true
 }
 if (b.scheduledAt && (!existing.lastBookingDate || new Date(b.scheduledAt) > new Date(existing.lastBookingDate))) {
 existing.lastBookingDate = b.scheduledAt
 }
 }
 }
 }
 }

 // Process booking requests (these have more detail)
 if (reqRes.ok) {
 const reqData = await reqRes.json()
 if (reqData.success && Array.isArray(reqData.data)) {
 for (const b of reqData.data) {
 const user = b.patient?.user
 const lastName = user?.lastName || 'Unknown'
 const key = `The ${lastName} Family`

 if (!familyMap.has(key)) {
 familyMap.set(key, {
 id: b.patient?.id || b.id,
 familyName: key,
 parentFirstName: user?.firstName || '',
 parentLastName: user?.lastName || '',
 email: user?.email || '',
 phone: user?.phone || '',
 profileImage: user?.profileImage || null,
 children: b.children || [],
 bookingCount: 1,
 lastBookingDate: b.scheduledAt,
 hasActiveBooking: b.status === 'pending' || b.status === 'upcoming' || b.status === 'confirmed',
 })
 } else {
 const existing = familyMap.get(key)!
 existing.bookingCount++
 if (!existing.email && user?.email) existing.email = user.email
 if (!existing.phone && user?.phone) existing.phone = user.phone
 if (!existing.parentFirstName && user?.firstName) existing.parentFirstName = user.firstName
 if (!existing.parentLastName && user?.lastName) existing.parentLastName = user.lastName
 if (b.children?.length) {
 const newChildren = b.children.filter((c: string) => !existing.children.includes(c))
 existing.children = [...existing.children, ...newChildren]
 }
 if (b.status === 'pending' || b.status === 'upcoming' || b.status === 'confirmed') {
 existing.hasActiveBooking = true
 }
 if (b.scheduledAt && (!existing.lastBookingDate || new Date(b.scheduledAt) > new Date(existing.lastBookingDate))) {
 existing.lastBookingDate = b.scheduledAt
 }
 }
 }
 }
 }

 setFamilies(Array.from(familyMap.values()))
 } catch (err) {
 console.error('Failed to fetch families:', err)
 setError(err instanceof Error ? err.message : 'Failed to load families')
 } finally {
 setLoading(false)
 }
 }

 fetchFamilies()
 }, [userId])

 const filteredFamilies = families
 .filter(f => {
 if (filterActive === 'active') return f.hasActiveBooking
 if (filterActive === 'past') return !f.hasActiveBooking
 return true
 })
 .filter(f => {
 if (!searchQuery) return true
 const q = searchQuery.toLowerCase()
 return (
 f.familyName.toLowerCase().includes(q) ||
 f.parentFirstName.toLowerCase().includes(q) ||
 f.parentLastName.toLowerCase().includes(q) ||
 f.email.toLowerCase().includes(q) ||
 f.children.some(c => c.toLowerCase().includes(q))
 )
 })
 .sort((a, b) => {
 // Active bookings first, then by most recent booking
 if (a.hasActiveBooking !== b.hasActiveBooking) return a.hasActiveBooking ? -1 : 1
 const dateA = a.lastBookingDate ? new Date(a.lastBookingDate).getTime() : 0
 const dateB = b.lastBookingDate ? new Date(b.lastBookingDate).getTime() : 0
 return dateB - dateA
 })

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
 <h1 className="text-2xl font-bold text-gray-900">Families</h1>
 <p className="text-gray-500 text-sm mt-1">
 {families.length} famil{families.length !== 1 ? 'ies' : 'y'} served
 </p>
 </div>
 </div>

 {/* Search and Filter */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search families, parents, or children..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition text-sm"
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
 ? 'bg-purple-600 text-white'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 <f.icon className="text-base" />
 </button>
 ))}
 </div>
 </div>

 {/* Families List */}
 {filteredFamilies.length === 0 ? (
 <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
 <FaUserFriends className="text-4xl text-gray-300 mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-gray-700 mb-2">
 {families.length === 0 ? 'No Families Yet' : 'No matching families'}
 </h3>
 <p className="text-gray-500 text-sm">
 {families.length === 0
 ? 'Families you care for will appear here once you start accepting bookings.'
 : 'Try adjusting your search or filter criteria.'}
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {filteredFamilies.map((family) => (
 <div
 key={family.id}
 className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
 >
 <div className="flex items-start gap-4">
 {family.profileImage ? (
 <img
 src={family.profileImage}
 alt={family.familyName}
 className="w-14 h-14 rounded-full flex-shrink-0"
 />
 ) : (
 <div className="w-14 h-14 bg-brand-teal rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
 {family.familyName.replace('The ', '').charAt(0)}
 </div>
 )}
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2 mb-1">
 <h3 className="font-semibold text-gray-900 text-base truncate">
 {family.familyName}
 </h3>
 {family.hasActiveBooking && (
 <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
 <FaCheckCircle className="text-green-500" />
 Active
 </span>
 )}
 </div>

 {(family.parentFirstName || family.parentLastName) && (
 <p className="text-sm text-gray-600 mb-2">
 {family.parentFirstName} {family.parentLastName}
 </p>
 )}

 {/* Contact Info */}
 <div className="space-y-1 mb-3">
 {family.email && (
 <p className="text-xs text-gray-500 flex items-center gap-2">
 <FaEnvelope className="text-gray-400" />
 {family.email}
 </p>
 )}
 {family.phone && (
 <p className="text-xs text-gray-500 flex items-center gap-2">
 <FaPhone className="text-gray-400" />
 {family.phone}
 </p>
 )}
 </div>

 {/* Children */}
 {family.children.length > 0 && (
 <div className="flex items-center gap-2 mb-3">
 <FaChild className="text-purple-400 text-sm" />
 <div className="flex flex-wrap gap-1">
 {family.children.map((child, idx) => (
 <span
 key={idx}
 className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full"
 >
 {child}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Stats */}
 <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
 <span className="flex items-center gap-1">
 <FaCalendarCheck className="text-gray-400" />
 {family.bookingCount} booking{family.bookingCount !== 1 ? 's' : ''}
 </span>
 {family.lastBookingDate && (
 <span className="flex items-center gap-1">
 <FaClock className="text-gray-400" />
 Last: {new Date(family.lastBookingDate).toLocaleDateString('en-US', {
 month: 'short',
 day: 'numeric',
 })}
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
