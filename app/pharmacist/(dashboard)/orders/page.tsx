'use client'

import { useState, useEffect, useCallback } from 'react'
import {
 FaClipboardList, FaFilter, FaClock, FaBoxOpen,
 FaTruck, FaCheckCircle, FaSearch, FaTimes
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'

interface OrderItem {
 id: string
 orderNumber: string
 customerName: string
 itemCount: number
 total: number
 status: string
 orderedAt: string
}

const ORDER_STATUSES = [
 { value: '', label: 'All Statuses' },
 { value: 'pending', label: 'Pending' },
 { value: 'prepared', label: 'Prepared' },
 { value: 'in-delivery', label: 'In Delivery' },
 { value: 'completed', label: 'Completed' },
]

const getStatusInfo = (status: string) => {
 switch (status) {
 case 'pending':
 return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: FaClock }
 case 'confirmed':
 case 'prepared':
 return { text: 'Prepared', color: 'bg-blue-100 text-blue-800', icon: FaBoxOpen }
 case 'shipped':
 case 'in-delivery':
 return { text: 'In Delivery', color: 'bg-purple-100 text-purple-800', icon: FaTruck }
 case 'delivered':
 case 'completed':
 return { text: 'Completed', color: 'bg-green-100 text-green-800', icon: FaCheckCircle }
 default:
 return { text: status, color: 'bg-gray-100 text-gray-800', icon: FaClock }
 }
}

export default function PharmacistOrdersPage() {
 const [orders, setOrders] = useState<OrderItem[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [statusFilter, setStatusFilter] = useState('')
 const [searchTerm, setSearchTerm] = useState('')

 const fetchOrders = useCallback(async () => {
 if (!userId) return
 try {
 setLoading(true)
 setError(null)
 const res = await fetch(`/api/pharmacists/${userId}/dashboard`)
 if (!res.ok) throw new Error('Failed to fetch orders')
 const json = await res.json()
 if (json.success) {
 setOrders(json.data.recentOrders || [])
 }
 } catch (err) {
 setError(err instanceof Error ? err.message : 'An error occurred')
 } finally {
 setLoading(false)
 }
 }, [userId])

 useEffect(() => {
 fetchOrders()
 }, [fetchOrders])

 const handleUpdateStatus = async (orderId: string, newStatus: string) => {
 try {
 const res = await fetch(`/api/bookings/pharmacy/${orderId}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status: newStatus }),
 })
 if (res.ok) {
 setOrders(prev =>
 prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
 )
 }
 } catch (err) {
 console.error('Failed to update order:', err)
 }
 }

 const filteredOrders = orders.filter(order => {
 const matchesStatus = !statusFilter || order.status === statusFilter
 const matchesSearch =
 !searchTerm ||
 order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
 order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
 return matchesStatus && matchesSearch
 })

 return (
 <div className="p-6 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center gap-3 mb-8">
 <FaClipboardList className="text-3xl text-teal-600" />
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
 <p className="text-sm text-gray-500">View and manage pharmacy orders</p>
 </div>
 </div>

 {/* Error Banner */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
 <span>{error}</span>
 <button onClick={() => setError(null)}>
 <FaTimes className="text-red-400 hover:text-red-600" />
 </button>
 </div>
 )}

 {/* Search and Filter */}
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search by order number or customer..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
 />
 </div>
 <div className="flex items-center gap-2">
 <FaFilter className="text-gray-400" />
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
 >
 {ORDER_STATUSES.map((s) => (
 <option key={s.value} value={s.value}>
 {s.label}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Loading */}
 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
 </div>
 ) : filteredOrders.length === 0 ? (
 /* Empty State */
 <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
 <FaClipboardList className="mx-auto text-4xl text-gray-300 mb-4" />
 <h3 className="text-lg font-medium text-gray-600 mb-1">No orders yet</h3>
 <p className="text-sm text-gray-400">
 {statusFilter || searchTerm
 ? 'Try adjusting your search or filter.'
 : 'Orders will appear here when customers place them.'}
 </p>
 </div>
 ) : (
 /* Orders Table */
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Order Number
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Customer
 </th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Items
 </th>
 <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Total (MUR)
 </th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Status
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Date
 </th>
 <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredOrders.map((order) => {
 const statusInfo = getStatusInfo(order.status)
 const StatusIcon = statusInfo.icon
 return (
 <tr key={order.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-6 py-4 font-mono text-sm text-gray-900">
 {order.orderNumber}
 </td>
 <td className="px-6 py-4 font-medium text-gray-900">
 {order.customerName}
 </td>
 <td className="px-6 py-4 text-center text-gray-700">
 {order.itemCount}
 </td>
 <td className="px-6 py-4 text-right font-medium text-gray-900">
 Rs {order.total.toLocaleString()}
 </td>
 <td className="px-6 py-4 text-center">
 <span
 className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${statusInfo.color}`}
 >
 <StatusIcon />
 {statusInfo.text}
 </span>
 </td>
 <td className="px-6 py-4 text-sm text-gray-500">
 {new Date(order.orderedAt).toLocaleDateString()}
 </td>
 <td className="px-6 py-4 text-center">
 {order.status === 'pending' && (
 <button
 onClick={() => handleUpdateStatus(order.id, 'prepared')}
 className="bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center gap-1"
 >
 <FaBoxOpen /> Prepare
 </button>
 )}
 {(order.status === 'confirmed' || order.status === 'prepared') && (
 <button
 onClick={() => handleUpdateStatus(order.id, 'in-delivery')}
 className="bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-purple-600 transition-colors inline-flex items-center gap-1"
 >
 <FaTruck /> Start Delivery
 </button>
 )}
 {order.status === 'in-delivery' && (
 <button
 onClick={() => handleUpdateStatus(order.id, 'completed')}
 className="bg-green-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-green-600 transition-colors inline-flex items-center gap-1"
 >
 <FaCheckCircle /> Complete
 </button>
 )}
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
