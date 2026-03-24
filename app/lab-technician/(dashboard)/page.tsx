'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 FaDollarSign, FaChartLine,
 FaClock, FaFileExport, FaStar, FaFileUpload,
 FaCheckCircle, FaSpinner, FaClipboardCheck
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

interface LabBookingItem {
 id: string
 appointmentId: string
 patientName: string
 testName: string
 total: number
 status: string
 scheduledAt: string
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

export default function LabDashboardPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState({
 dailyRevenue: 0,
 pendingResults: 0,
 monthlyRevenue: 0,
 walletBalance: 0,
 })
 const [recentBookings, setRecentBookings] = useState<LabBookingItem[]>([])
 const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null)

 useEffect(() => {
 if (!userId) return

 const fetchDashboard = async () => {
 try {
 const res = await fetch(`/api/lab-techs/${userId}/dashboard`)
 if (res.ok) {
 const json = await res.json()
 if (json.success) {
 setStats(json.data.stats)
 setRecentBookings(json.data.recentBookings || [])
 }
 }
 } catch (error) {
 console.error('Failed to fetch lab dashboard:', error)
 } finally {
 setLoading(false)
 }
 }

 fetchDashboard()
 }, [userId])

 const getStatusInfo = (status: string) => {
 switch (status) {
 case 'pending': case 'sample-collected': return { text: 'Sample Collected', color: 'bg-yellow-100 text-yellow-800', icon: FaClock }
 case 'upcoming': case 'in-progress': return { text: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: FaSpinner }
 case 'result-ready': return { text: 'Result Ready', color: 'bg-purple-100 text-purple-800', icon: FaClipboardCheck }
 case 'completed': return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: FaCheckCircle }
 default: return { text: status, color: 'bg-gray-100 text-gray-800', icon: FaClock }
 }
 }

 const handleBookingAction = async (bookingId: string, action: 'accept' | 'deny') => {
 setActionLoading({ id: bookingId, action })
 try {
 const res = await fetch('/api/bookings/action', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ bookingId, bookingType: 'lab_test', action }),
 })
 if (res.ok) {
 if (action === 'accept') {
 setRecentBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'in-progress' } : b))
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

 const platformFeeRate = 0.05
 const platformFee = Math.round(stats.dailyRevenue * platformFeeRate)
 const netPayout = stats.dailyRevenue - platformFee

 return (
 <>
 {userId && (
 <div className="mb-8">
 <WalletBalanceCard userId={userId} />
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard icon={FaDollarSign} title="Today's Revenue" value={loading ? '...' : `Rs ${stats.dailyRevenue.toLocaleString()}`} color="bg-green-500" />
 <StatCard icon={FaSpinner} title="Pending Results" value={loading ? '...' : stats.pendingResults} color="bg-yellow-500" />
 <StatCard icon={FaChartLine} title="Monthly Revenue" value={loading ? '...' : `Rs ${stats.monthlyRevenue.toLocaleString()}`} color="bg-blue-500" />
 <StatCard icon={FaStar} title="Wallet Balance" value={loading ? '...' : `Rs ${stats.walletBalance.toLocaleString()}`} color="bg-purple-500" />
 </div>

 <div className="grid lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Recent Appointments</h2>
 <Link href="/lab-technician/results" className="text-purple-600 hover:underline font-medium">View All</Link>
 </div>
 {loading ? (
 <div className="flex justify-center py-8">
 <FaSpinner className="animate-spin text-2xl text-purple-500" />
 </div>
 ) : recentBookings.length === 0 ? (
 <p className="text-gray-500 text-center py-8">No appointments yet</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-gray-50">
 <tr>
 <th className="p-3 font-medium text-gray-600">ID</th>
 <th className="p-3 font-medium text-gray-600">Patient</th>
 <th className="p-3 font-medium text-gray-600">Test</th>
 <th className="p-3 font-medium text-gray-600">Status</th>
 <th className="p-3 font-medium text-gray-600">Action</th>
 </tr>
 </thead>
 <tbody>
 {recentBookings.map((apt) => {
 const statusInfo = getStatusInfo(apt.status)
 return (
 <tr key={apt.id} className="border-b hover:bg-gray-50">
 <td className="p-3 font-mono text-xs">{apt.appointmentId}</td>
 <td className="p-3 font-medium">{apt.patientName}</td>
 <td className="p-3 text-gray-600">{apt.testName}</td>
 <td className="p-3">
 <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${statusInfo.color}`}>
 <statusInfo.icon className={statusInfo.icon === FaSpinner ? 'animate-spin' : ''} /> {statusInfo.text}
 </span>
 </td>
 <td className="p-3">
 {apt.status === 'pending' && (
 <div className="flex gap-2">
 <button onClick={() => handleBookingAction(apt.id, 'accept')} disabled={actionLoading?.id === apt.id} className="bg-green-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-1">
 {actionLoading?.id === apt.id && actionLoading.action === 'accept' && <FaSpinner className="animate-spin" />}
 Accept
 </button>
 <button onClick={() => handleBookingAction(apt.id, 'deny')} disabled={actionLoading?.id === apt.id} className="bg-gray-200 text-gray-800 text-xs font-bold py-2 px-3 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors flex items-center gap-1">
 {actionLoading?.id === apt.id && actionLoading.action === 'deny' && <FaSpinner className="animate-spin" />}
 Decline
 </button>
 </div>
 )}
 {apt.status === 'result-ready' && (
 <Link href={`/lab-technician/results?send=${apt.id}`} className="bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-purple-600 transition-colors inline-flex items-center gap-1">
 <FaFileUpload /> Send Result
 </Link>
 )}
 {(apt.status === 'upcoming' || apt.status === 'in-progress') && (
 <Link href={`/lab-technician/appointments?view=${apt.id}`} className="bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors inline-block">
 View Details
 </Link>
 )}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>

 <div className="space-y-8">
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-bold text-gray-900">Today&apos;s Payout</h3>
 <button aria-label="Export data" className="text-purple-600 text-sm hover:underline"><FaFileExport /></button>
 </div>
 <div className="space-y-3">
 <div className="flex justify-between text-sm"><span className="text-gray-600">Total Revenue</span><span className="font-medium">Rs {stats.dailyRevenue.toLocaleString()}</span></div>
 <div className="flex justify-between text-sm"><span className="text-gray-600">Platform Fee (5%)</span><span className="font-medium text-red-500">-Rs {platformFee.toLocaleString()}</span></div>
 <div className="border-t pt-3 mt-3 flex justify-between">
 <span className="font-bold">Net Payout</span>
 <span className="font-bold text-xl text-green-600">Rs {netPayout.toLocaleString()}</span>
 </div>
 </div>
 </div>

 <div className="bg-brand-navy text-white rounded-2xl p-6">
 <h3 className="text-lg font-bold mb-2">Manage Your Lab Profile</h3>
 <p className="text-white/90 text-sm mb-4">Keep your lab certifications and equipment list updated to attract more patients.</p>
 <Link href="/lab-technician/profile" className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">
 Update Certifications
 </Link>
 </div>
 </div>
 </div>
 </>
 )
}
