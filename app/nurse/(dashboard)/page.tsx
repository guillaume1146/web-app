'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 FaCalendarCheck, FaDollarSign, FaStar, FaChartLine,
 FaClipboardList, FaClock, FaUniversity,
 FaFileInvoiceDollar, FaCheckCircle, FaSpinner, FaTimesCircle
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { IconType } from 'react-icons'
import WalletBalanceCard from '@/components/shared/WalletBalanceCard'

interface StatCardProps {
 icon: IconType
 title: string
 value: string | number
 change?: string
 color: string
}

interface BookingItem {
 id: string
 patientName: string
 patientAvatar: string
 scheduledAt: string
 serviceType: string
 status: string
}

const StatCard = ({ icon: Icon, title, value, change, color }: StatCardProps) => (
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform hover:-translate-y-1 transition-transform duration-300">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-gray-600 text-sm font-medium">{title}</p>
 <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
 {change && (
 <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
 {change} from last month
 </p>
 )}
 </div>
 <div className={`p-3 rounded-full ${color}`}>
 <Icon className="text-white text-xl" />
 </div>
 </div>
 </div>
)

const AppointmentStatusIcon = ({ status }: { status: string }) => {
 if (status === 'completed') return <FaCheckCircle className="text-green-500" />
 if (status === 'upcoming' || status === 'pending') return <FaSpinner className="text-blue-500 animate-spin" />
 if (status === 'cancelled') return <FaTimesCircle className="text-red-500" />
 return null
}

export default function NurseDashboardPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState({
 todayAppointments: 0,
 completedServices: 0,
 monthlyCompletedServices: 0,
 walletBalance: 0,
 })
 const [recentBookings, setRecentBookings] = useState<BookingItem[]>([])
 const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null)

 useEffect(() => {
 if (!userId) return

 const fetchDashboard = async () => {
 try {
 const res = await fetch(`/api/nurses/${userId}/dashboard`)
 if (res.ok) {
 const json = await res.json()
 if (json.success) {
 setStats(json.data.stats)
 setRecentBookings(json.data.recentBookings || [])
 }
 }
 } catch (error) {
 console.error('Failed to fetch nurse dashboard:', error)
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
 body: JSON.stringify({ bookingId, bookingType: 'nurse', action }),
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

 const platformFeeRate = 0.10
 const monthlyEarnings = stats.monthlyCompletedServices * 500 // estimate per service
 const commission = Math.round(monthlyEarnings * platformFeeRate)
 const netPayout = monthlyEarnings - commission

 return (
 <>
 {userId && (
 <div className="mb-8">
 <WalletBalanceCard userId={userId} />
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard
 icon={FaCalendarCheck}
 title="Today's Appointments"
 value={loading ? '...' : stats.todayAppointments}
 color="bg-blue-500"
 />
 <StatCard
 icon={FaClipboardList}
 title="Total Services Completed"
 value={loading ? '...' : stats.completedServices}
 color="bg-green-500"
 />
 <StatCard
 icon={FaDollarSign}
 title="Wallet Balance"
 value={loading ? '...' : `Rs ${stats.walletBalance.toLocaleString()}`}
 color="bg-purple-500"
 />
 <StatCard
 icon={FaStar}
 title="This Month Completed"
 value={loading ? '...' : stats.monthlyCompletedServices}
 color="bg-yellow-500"
 />
 </div>

 <div className="grid lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Recent Appointments</h2>
 <Link href="/nurse/appointments" className="text-teal-600 hover:underline font-medium">
 View All
 </Link>
 </div>
 {loading ? (
 <div className="flex justify-center py-8">
 <FaSpinner className="animate-spin text-2xl text-teal-500" />
 </div>
 ) : recentBookings.length === 0 ? (
 <p className="text-gray-500 text-center py-8">No appointments yet</p>
 ) : (
 <div className="space-y-4">
 {recentBookings.map((apt) => (
 <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
 <div className="flex items-center gap-4">
 <img src={apt.patientAvatar} alt={apt.patientName} className="w-12 h-12 rounded-full" loading="lazy" />
 <div>
 <h3 className="font-semibold text-gray-900">{apt.patientName}</h3>
 <p className="text-gray-600 text-sm">
 {new Date(apt.scheduledAt).toLocaleDateString()} at {new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {apt.serviceType}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
 apt.status === 'completed' ? 'bg-green-100 text-green-800' :
 apt.status === 'upcoming' || apt.status === 'pending' ? 'bg-blue-100 text-blue-800' :
 'bg-red-100 text-red-800'
 }`}>
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
 <h2 className="text-xl font-bold text-gray-900 mb-6">Earnings Summary (Monthly)</h2>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
 <div>
 <p className="text-gray-500 text-sm">Wallet Balance</p>
 <p className="text-3xl font-bold text-gray-800 mt-1">Rs {stats.walletBalance.toLocaleString()}</p>
 </div>
 <div>
 <p className="text-gray-500 text-sm">This Month Services</p>
 <p className="text-3xl font-bold text-blue-600 mt-1">{stats.monthlyCompletedServices}</p>
 </div>
 <div>
 <p className="text-gray-500 text-sm">Total Completed</p>
 <p className="text-3xl font-bold text-green-600 mt-1">{stats.completedServices}</p>
 </div>
 </div>
 <div className="mt-6 pt-6 border-t">
 <p className="text-sm text-center text-gray-600">Earnings are updated in real-time from your wallet balance.</p>
 </div>
 </div>
 </div>

 <div className="space-y-8">
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <h3 className="text-lg font-bold text-gray-900 mb-4">Your Availability</h3>
 <p className="text-sm text-gray-600 mb-4">
 Your schedule is set for this week. Update your availability to get more bookings.
 </p>
 <div className="flex items-center gap-2 text-green-600 mb-4">
 <FaCheckCircle />
 <span className="text-sm font-medium">Available for emergency bookings</span>
 </div>
 <Link href="/nurse/profile?tab=availability" className="w-full bg-teal-100 text-teal-800 text-center py-2.5 rounded-lg font-semibold hover:bg-teal-200 transition-colors flex items-center justify-center gap-2">
 <FaClock />
 Manage Schedule
 </Link>
 </div>

 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Details</h3>
 <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
 <FaUniversity className="text-green-600 text-xl" />
 <div>
 <p className="text-sm font-semibold text-green-800">Bank Account Verified</p>
 <p className="text-xs text-gray-600">Payouts are sent to your wallet</p>
 </div>
 </div>
 <Link href="/nurse/profile?tab=payments" className="w-full bg-gray-100 text-gray-800 text-center mt-4 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
 <FaFileInvoiceDollar />
 View Transactions
 </Link>
 </div>

 <div className="bg-brand-teal text-white rounded-2xl p-6">
 <h3 className="text-lg font-bold mb-2">Complete Your Profile</h3>
 <p className="text-white/90 text-sm mb-4">
 A complete profile helps you get chosen by more patients.
 </p>
 <Link href="/nurse/profile?tab=documents" className="bg-white text-teal-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">
 Upload Documents
 </Link>
 </div>
 </div>
 </div>
 </>
 )
}
