'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
 FaClipboardList, FaDollarSign, FaReceipt,
 FaTruck, FaClock, FaFileExport,
 FaCheckCircle, FaBoxOpen, FaStar, FaSpinner
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

interface OrderItem {
 id: string
 orderNumber: string
 customerName: string
 itemCount: number
 total: number
 status: string
 orderedAt: string
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

export default function PharmacyDashboardPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState({
 dailyRevenue: 0,
 pendingOrders: 0,
 monthlyRevenue: 0,
 walletBalance: 0,
 })
 const [recentOrders, setRecentOrders] = useState<OrderItem[]>([])

 useEffect(() => {
 if (!userId) return

 const fetchDashboard = async () => {
 try {
 const res = await fetch(`/api/pharmacists/${userId}/dashboard`)
 if (res.ok) {
 const json = await res.json()
 if (json.success) {
 setStats(json.data.stats)
 setRecentOrders(json.data.recentOrders || [])
 }
 }
 } catch (error) {
 console.error('Failed to fetch pharmacist dashboard:', error)
 } finally {
 setLoading(false)
 }
 }

 fetchDashboard()
 }, [userId])

 const getStatusInfo = (status: string) => {
 switch (status) {
 case 'pending': return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: FaClock }
 case 'confirmed': case 'prepared': return { text: 'Prepared', color: 'bg-blue-100 text-blue-800', icon: FaBoxOpen }
 case 'shipped': case 'in-delivery': return { text: 'In Delivery', color: 'bg-purple-100 text-purple-800', icon: FaTruck }
 case 'delivered': case 'completed': return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: FaCheckCircle }
 default: return { text: status, color: 'bg-gray-100 text-gray-800', icon: FaClock }
 }
 }

 const handleMarkDelivery = async (orderId: string) => {
 try {
 const res = await fetch(`/api/bookings/pharmacy/${orderId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status: 'in-delivery' }),
 })
 if (res.ok) {
 setRecentOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'in-delivery' } : o))
 }
 } catch (error) {
 console.error('Failed to update order:', error)
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
 <StatCard icon={FaClipboardList} title="Pending Orders" value={loading ? '...' : stats.pendingOrders} color="bg-yellow-500" />
 <StatCard icon={FaReceipt} title="Monthly Revenue" value={loading ? '...' : `Rs ${stats.monthlyRevenue.toLocaleString()}`} color="bg-blue-500" />
 <StatCard icon={FaStar} title="Wallet Balance" value={loading ? '...' : `Rs ${stats.walletBalance.toLocaleString()}`} color="bg-purple-500" />
 </div>

 <div className="grid lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 <div className="bg-white rounded-2xl p-6 shadow-lg">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
 <Link href="/pharmacist/orders" className="text-green-600 hover:underline font-medium">View All Orders</Link>
 </div>
 {loading ? (
 <div className="flex justify-center py-8">
 <FaSpinner className="animate-spin text-2xl text-green-500" />
 </div>
 ) : recentOrders.length === 0 ? (
 <p className="text-gray-500 text-center py-8">No orders yet</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm text-left">
 <thead className="bg-gray-50">
 <tr>
 <th className="p-3 font-medium text-gray-600">Order ID</th>
 <th className="p-3 font-medium text-gray-600">Customer</th>
 <th className="p-3 font-medium text-gray-600">Total</th>
 <th className="p-3 font-medium text-gray-600">Status</th>
 <th className="p-3 font-medium text-gray-600">Action</th>
 </tr>
 </thead>
 <tbody>
 {recentOrders.map((order) => {
 const statusInfo = getStatusInfo(order.status)
 return (
 <tr key={order.id} className="border-b hover:bg-gray-50">
 <td className="p-3 font-mono text-xs">{order.orderNumber}</td>
 <td className="p-3 font-medium">{order.customerName}</td>
 <td className="p-3">Rs {order.total.toLocaleString()}</td>
 <td className="p-3">
 <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${statusInfo.color}`}>
 <statusInfo.icon /> {statusInfo.text}
 </span>
 </td>
 <td className="p-3">
 {(order.status === 'confirmed' || order.status === 'prepared') && (
 <button onClick={() => handleMarkDelivery(order.id)} className="bg-green-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1">
 <FaTruck /> Start Delivery
 </button>
 )}
 {order.status === 'pending' && (
 <Link href={`/pharmacist/orders?view=${order.id}`} className="bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors inline-block">
 View Order
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
 <button aria-label="Export data" className="text-green-600 text-sm hover:underline"><FaFileExport /></button>
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
 <h3 className="text-lg font-bold mb-2">Complete Your Pharmacy Profile</h3>
 <p className="text-white/90 text-sm mb-4">Add pharmacist details and certifications to build trust.</p>
 <Link href="/pharmacist/profile" className="bg-white text-green-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition">
 Upload License
 </Link>
 </div>
 </div>
 </div>
 </>
 )
}
