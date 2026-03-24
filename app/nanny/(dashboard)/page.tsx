'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 FaCalendarCheck, FaDollarSign, FaStar,
 FaClock, FaFileExport, FaSpinner,
 FaUserFriends
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { IconType } from 'react-icons'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'

interface StatCardProps {
 icon: IconType
 title: string
 value: string | number
 color: string
}

interface BookingItem {
 id: string
 familyName: string
 familyAvatar: string
 scheduledAt: string
 duration: number
 serviceType: string
 status: string
}

const StatCard = ({ icon: Icon, title, value, color }: StatCardProps) => (
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform hover:-translate-y-1 transition-transform duration-300">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-gray-600 text-sm font-medium">{title}</p>
 <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
 </div>
 <div className={`p-3 rounded-full ${color}`}>
 <Icon className="text-white text-xl" />
 </div>
 </div>
 </div>
)

export default function CaregiverDashboardPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState({
 upcomingBookings: 0,
 familiesHelped: 0,
 monthlyCompletedBookings: 0,
 walletBalance: 0,
 })
 const [recentBookings, setRecentBookings] = useState<BookingItem[]>([])
 const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null)

 useEffect(() => {
 if (!userId) return

 const fetchDashboard = async () => {
 try {
 const res = await fetch(`/api/nannies/${userId}/dashboard`)
 if (res.ok) {
 const json = await res.json()
 if (json.success) {
 setStats(json.data.stats)
 setRecentBookings(json.data.recentBookings || [])
 }
 }
 } catch (error) {
 console.error('Failed to fetch nanny dashboard:', error)
 } finally {
 setLoading(false)
 }
 }

 fetchDashboard()
 }, [userId])

 const handleBookingAction = async (bookingId: string, action: 'accept' | 'deny') => {
 setActionLoading({ id: bookingId, action })
 try {
 const res = await fetch('/api/bookings/action', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ bookingId, bookingType: 'nanny', action }),
 })
 if (res.ok) {
 if (action === 'accept') {
 setRecentBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'upcoming' } : b))
 } else {
 setRecentBookings(prev => prev.filter(b => b.id !== bookingId))
 }
 }
 } catch (error) {
 console.error(`Failed to ${action} booking:`, error)
 } finally {
 setActionLoading(null)
 }
 }

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'confirmed': case 'upcoming': return 'bg-green-100 text-green-800'
 case 'pending': return 'bg-yellow-100 text-yellow-800'
 case 'completed': return 'bg-blue-100 text-blue-800'
 default: return 'bg-gray-100 text-gray-800'
 }
 }

 return (
 <>
 {userId && (
 <div className="mb-8">
 <WalletBalanceCard userId={userId} />
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard icon={FaCalendarCheck} title="Upcoming Bookings" value={loading ? '...' : stats.upcomingBookings} color="bg-blue-500" />
 <StatCard icon={FaUserFriends} title="Families Helped" value={loading ? '...' : stats.familiesHelped} color="bg-green-500" />
 <StatCard icon={FaDollarSign} title="Wallet Balance" value={loading ? '...' : `Rs ${(stats.walletBalance ?? 0).toLocaleString()}`} color="bg-purple-500" />
 <StatCard icon={FaStar} title="This Month Completed" value={loading ? '...' : stats.monthlyCompletedBookings} color="bg-yellow-500" />
 </div>

 <div className="grid lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Recent Appointments</h2>
 <Link href="/nanny/bookings" className="text-purple-600 hover:underline font-medium">View All</Link>
 </div>
 {loading ? (
 <div className="flex justify-center py-8">
 <FaSpinner className="animate-spin text-2xl text-purple-500" />
 </div>
 ) : recentBookings.length === 0 ? (
 <p className="text-gray-500 text-center py-8">No bookings yet</p>
 ) : (
 <div className="space-y-4">
 {recentBookings.map((apt) => (
 <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
 <div className="flex items-center gap-4">
 <img src={apt.familyAvatar} alt={apt.familyName} className="w-12 h-12 rounded-full" loading="lazy" />
 <div>
 <h3 className="font-semibold text-gray-900">{apt.familyName}</h3>
 <p className="text-gray-600 text-sm">
 {new Date(apt.scheduledAt).toLocaleDateString()} at {new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 {apt.duration ? ` (${apt.duration}min)` : ''}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(apt.status)}`}>
 {apt.status}
 </span>
 {apt.status === 'pending' && (
 <div className="flex gap-2">
 <button onClick={() => handleBookingAction(apt.id, 'accept')} disabled={actionLoading?.id === apt.id} className="bg-green-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-1">
 {actionLoading?.id === apt.id && actionLoading.action === 'accept' && <FaSpinner className="animate-spin" />}
 Accept
 </button>
 <button onClick={() => handleBookingAction(apt.id, 'deny')} disabled={actionLoading?.id === apt.id} className="bg-gray-200 text-gray-800 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors flex items-center gap-1">
 {actionLoading?.id === apt.id && actionLoading.action === 'deny' && <FaSpinner className="animate-spin" />}
 Decline
 </button>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Earnings Summary</h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
 <div>
 <p className="text-gray-500 text-sm">Wallet Balance</p>
 <p className="text-3xl font-bold text-gray-800 mt-1">Rs {(stats.walletBalance ?? 0).toLocaleString()}</p>
 </div>
 <div>
 <p className="text-gray-500 text-sm">Families Helped</p>
 <p className="text-3xl font-bold text-blue-600 mt-1">{stats.familiesHelped}</p>
 </div>
 <div>
 <p className="text-gray-500 text-sm">This Month</p>
 <p className="text-3xl font-bold text-green-600 mt-1">{stats.monthlyCompletedBookings} completed</p>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-8">
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <h3 className="text-lg font-bold text-gray-900 mb-4">Your Availability</h3>
 <p className="text-sm text-gray-600 mb-4">Your schedule is visible to parents. Keep it updated to receive booking requests.</p>
 <Link href="/nanny/profile?tab=availability" className="w-full bg-purple-100 text-purple-800 text-center py-2.5 rounded-lg font-semibold hover:bg-purple-200 transition-colors flex items-center justify-center gap-2">
 <FaClock />
 Manage Calendar
 </Link>
 </div>

 <div className="bg-brand-navy text-white rounded-2xl p-6">
 <h3 className="text-lg font-bold mb-2">Enhance Your Profile</h3>
 <p className="text-white/90 text-sm mb-4">Caregivers with complete profiles get 3x more bookings.</p>
 <Link href="/nanny/profile?tab=documents" className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">
 Upload Certifications
 </Link>
 </div>
 </div>
 </div>
 </>
 )
}
