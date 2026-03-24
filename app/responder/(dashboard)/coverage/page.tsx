'use client'

import { useState, useEffect } from 'react'
import {
 FaMapMarkerAlt,
 FaShieldAlt,
 FaClock,
 FaRoute,
 FaCheckCircle,
} from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'
import { IconType } from 'react-icons'

interface CoverageData {
 responseZone: string
 responseRadius: number
 averageResponseTime: string
 totalCallsInZone: number
 activeStatus: boolean
 districts: string[]
}

interface StatCardProps {
 icon: IconType
 title: string
 value: string | number
 color: string
}

const StatCard = ({ icon: Icon, title, value, color }: StatCardProps) => (
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
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

export default function CoverageAreaPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [coverage, setCoverage] = useState<CoverageData | null>(null)

 useEffect(() => {
 if (!userId) return

 const fetchCoverage = async () => {
 try {
 setLoading(true)
 // Fetch from responder dashboard which includes coverage info
 const res = await fetch(`/api/responders/${userId}/dashboard`)
 if (!res.ok) {
 if (res.status === 404) {
 setCoverage(null)
 return
 }
 throw new Error('Failed to fetch coverage data')
 }
 const json = await res.json()
 if (json.success && json.data) {
 const d = json.data
 setCoverage({
 responseZone: d.coverage?.responseZone ?? d.responseZone ?? 'Not configured',
 responseRadius: d.coverage?.responseRadius ?? d.responseRadius ?? 0,
 averageResponseTime: d.coverage?.averageResponseTime ?? d.averageResponseTime ?? '—',
 totalCallsInZone: d.coverage?.totalCallsInZone ?? d.stats?.completedServices ?? 0,
 activeStatus: d.coverage?.activeStatus ?? true,
 districts: d.coverage?.districts ?? [],
 })
 }
 } catch (err) {
 console.error('Failed to fetch coverage data:', err)
 setError(err instanceof Error ? err.message : 'An error occurred')
 } finally {
 setLoading(false)
 }
 }

 fetchCoverage()
 }, [userId])

 return (
 <div className="p-6 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center gap-3 mb-8">
 <FaMapMarkerAlt className="text-3xl text-blue-600" />
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Coverage Area</h1>
 <p className="text-sm text-gray-500">View your response zone and coverage settings</p>
 </div>
 </div>

 {/* Error Banner */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
 {error}
 </div>
 )}

 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
 </div>
 ) : (
 <>
 {/* Stats */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard
 icon={FaMapMarkerAlt}
 title="Response Zone"
 value={coverage?.responseZone || 'Not set'}
 color="bg-blue-500"
 />
 <StatCard
 icon={FaRoute}
 title="Response Radius"
 value={coverage?.responseRadius ? `${coverage.responseRadius} km` : 'Not set'}
 color="bg-indigo-500"
 />
 <StatCard
 icon={FaClock}
 title="Avg. Response Time"
 value={coverage?.averageResponseTime || '—'}
 color="bg-orange-500"
 />
 <StatCard
 icon={FaShieldAlt}
 title="Calls in Zone"
 value={coverage?.totalCallsInZone ?? 0}
 color="bg-green-500"
 />
 </div>

 {/* Coverage Details */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Current Zone Info */}
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
 <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
 <FaMapMarkerAlt className="text-blue-600" />
 Zone Details
 </h2>
 <div className="space-y-4">
 <div className="flex items-center justify-between py-3 border-b border-gray-100">
 <span className="text-gray-600">Primary Zone</span>
 <span className="font-semibold text-gray-900">
 {coverage?.responseZone || 'Not configured'}
 </span>
 </div>
 <div className="flex items-center justify-between py-3 border-b border-gray-100">
 <span className="text-gray-600">Coverage Radius</span>
 <span className="font-semibold text-gray-900">
 {coverage?.responseRadius ? `${coverage.responseRadius} km` : '—'}
 </span>
 </div>
 <div className="flex items-center justify-between py-3 border-b border-gray-100">
 <span className="text-gray-600">Active Status</span>
 <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
 coverage?.activeStatus
 ? 'bg-green-100 text-green-700'
 : 'bg-red-100 text-red-700'
 }`}>
 <FaCheckCircle className="text-xs" />
 {coverage?.activeStatus ? 'Active' : 'Inactive'}
 </span>
 </div>
 <div className="flex items-center justify-between py-3">
 <span className="text-gray-600">Average Response Time</span>
 <span className="font-semibold text-gray-900">
 {coverage?.averageResponseTime || '—'}
 </span>
 </div>
 </div>
 </div>

 {/* Districts Covered */}
 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
 <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
 <FaShieldAlt className="text-indigo-600" />
 Coverage Statistics
 </h2>
 {coverage?.districts && coverage.districts.length > 0 ? (
 <div>
 <p className="text-sm text-gray-500 mb-3">Districts covered:</p>
 <div className="flex flex-wrap gap-2">
 {coverage.districts.map((district, idx) => (
 <span
 key={idx}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
 >
 <FaMapMarkerAlt className="text-xs" />
 {district}
 </span>
 ))}
 </div>
 </div>
 ) : (
 <div className="text-center py-8">
 <FaMapMarkerAlt className="mx-auto text-3xl text-gray-300 mb-3" />
 <p className="text-gray-500 text-sm">No district data available</p>
 <p className="text-gray-400 text-xs mt-1">
 District coverage information will be displayed once configured.
 </p>
 </div>
 )}

 <div className="mt-6 pt-4 border-t border-gray-100">
 <div className="bg-brand-navy text-white rounded-xl p-4">
 <p className="font-semibold">Total Calls Handled</p>
 <p className="text-3xl font-bold mt-1">{coverage?.totalCallsInZone ?? 0}</p>
 <p className="text-sm text-white/70 mt-1">in your coverage zone</p>
 </div>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 )
}
