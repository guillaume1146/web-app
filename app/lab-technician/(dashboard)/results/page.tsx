'use client'

import { useState, useEffect } from 'react'
import { FaClipboardCheck, FaSearch, FaClock, FaCheckCircle, FaPaperPlane, FaFlask, FaPen, FaTimes, FaSpinner, FaEye } from 'react-icons/fa'
import { useUser } from '@/hooks/useUser'

interface LabResult {
 id: string
 patientName: string
 testName: string
 status: 'pending' | 'ready' | 'sent'
 date: string
 category?: string
 resultFindings?: string
 resultNotes?: string
 resultDate?: string
}

export default function LabResultsPage() {
 const { user: currentUser } = useUser()
 const userId = currentUser?.id ?? ''
 const [results, setResults] = useState<LabResult[]>([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [searchTerm, setSearchTerm] = useState('')
 const [statusFilter, setStatusFilter] = useState('')

 // Write result modal state
 const [writeModalOpen, setWriteModalOpen] = useState(false)
 const [selectedBooking, setSelectedBooking] = useState<LabResult | null>(null)
 const [findings, setFindings] = useState('')
 const [resultNotes, setResultNotes] = useState('')
 const [submitting, setSubmitting] = useState(false)
 const [submitError, setSubmitError] = useState('')

 // View result modal state
 const [viewModalOpen, setViewModalOpen] = useState(false)
 const [viewBooking, setViewBooking] = useState<LabResult | null>(null)

 const fetchResults = async () => {
 if (!userId) return
 try {
 setLoading(true)
 const res = await fetch(`/api/lab-techs/${userId}/results`)
 if (!res.ok) {
 if (res.status === 404) {
 setResults([])
 return
 }
 throw new Error('Failed to fetch lab results')
 }
 const json = await res.json()
 setResults(json.data ?? json.results ?? (Array.isArray(json) ? json : []))
 } catch (err) {
 console.error('Failed to fetch lab results:', err)
 setError(err instanceof Error ? err.message : 'An error occurred')
 setResults([])
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 fetchResults()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [userId])

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'pending':
 return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: FaClock }
 case 'ready':
 return { label: 'Results Ready', color: 'bg-green-100 text-green-800', icon: FaCheckCircle }
 case 'sent':
 return { label: 'Sent', color: 'bg-blue-100 text-blue-800', icon: FaPaperPlane }
 default:
 return { label: status, color: 'bg-gray-100 text-gray-800', icon: FaClock }
 }
 }

 const filteredResults = results.filter((result) => {
 const matchesSearch =
 result.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 result.testName.toLowerCase().includes(searchTerm.toLowerCase())
 const matchesStatus = !statusFilter || result.status === statusFilter
 return matchesSearch && matchesStatus
 })

 const openWriteModal = (booking: LabResult) => {
 setSelectedBooking(booking)
 setFindings('')
 setResultNotes('')
 setSubmitError('')
 setWriteModalOpen(true)
 }

 const openViewModal = (booking: LabResult) => {
 setViewBooking(booking)
 setViewModalOpen(true)
 }

 const handleSubmitResult = async () => {
 if (!selectedBooking || !findings.trim()) return
 setSubmitting(true)
 setSubmitError('')

 try {
 const res = await fetch(`/api/lab-techs/${userId}/results/${selectedBooking.id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 resultFindings: findings.trim(),
 resultNotes: resultNotes.trim() || undefined,
 }),
 })

 const json = await res.json()
 if (json.success) {
 setWriteModalOpen(false)
 fetchResults()
 } else {
 setSubmitError(json.message || 'Failed to submit results')
 }
 } catch {
 setSubmitError('Network error. Please try again.')
 } finally {
 setSubmitting(false)
 }
 }

 return (
 <div className="p-6 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex items-center gap-3 mb-8">
 <FaClipboardCheck className="text-3xl text-purple-600" />
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
 <p className="text-sm text-gray-500">View and manage patient test results</p>
 </div>
 </div>

 {/* Error Banner */}
 {error && (
 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
 {error}
 </div>
 )}

 {/* Search and Filter */}
 <div className="flex flex-col sm:flex-row gap-4 mb-6">
 <div className="relative flex-1">
 <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Search by patient or test name..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
 />
 </div>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
 >
 <option value="">All Statuses</option>
 <option value="pending">Pending</option>
 <option value="ready">Results Ready</option>
 <option value="sent">Sent</option>
 </select>
 </div>

 {/* Table */}
 {loading ? (
 <div className="flex justify-center items-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
 </div>
 ) : filteredResults.length === 0 ? (
 <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
 <FaFlask className="mx-auto text-4xl text-gray-300 mb-4" />
 <h3 className="text-lg font-medium text-gray-600 mb-1">No lab results to display</h3>
 <p className="text-sm text-gray-400">
 {searchTerm || statusFilter
 ? 'Try adjusting your search or filter.'
 : 'Results will appear here once tests are processed.'}
 </p>
 </div>
 ) : (
 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Patient Name
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Test Name
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Status
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Date
 </th>
 <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {filteredResults.map((result) => {
 const badge = getStatusBadge(result.status)
 const BadgeIcon = badge.icon
 return (
 <tr key={result.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-6 py-4 font-medium text-gray-900">
 {result.patientName}
 </td>
 <td className="px-6 py-4 text-gray-700">
 {result.testName}
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
 <BadgeIcon className="text-[10px]" />
 {badge.label}
 </span>
 </td>
 <td className="px-6 py-4 text-gray-700">
 {new Date(result.date).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 })}
 </td>
 <td className="px-6 py-4">
 {result.status === 'pending' ? (
 <button
 onClick={() => openWriteModal(result)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition"
 >
 <FaPen className="text-[10px]" />
 Write Result
 </button>
 ) : (
 <button
 onClick={() => openViewModal(result)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition border border-green-200"
 >
 <FaEye className="text-[10px]" />
 View Result
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

 {/* Write Result Modal */}
 {writeModalOpen && selectedBooking && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
 <div className="p-5 border-b border-gray-200 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-gray-900">Write Test Result</h3>
 <p className="text-sm text-gray-500 mt-0.5">
 {selectedBooking.testName} — {selectedBooking.patientName}
 </p>
 </div>
 <button
 onClick={() => setWriteModalOpen(false)}
 className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
 >
 <FaTimes />
 </button>
 </div>

 <div className="p-5 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 Findings <span className="text-red-500">*</span>
 </label>
 <textarea
 rows={5}
 value={findings}
 onChange={(e) => setFindings(e.target.value)}
 className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
 placeholder="Enter test results, measurements, values, and clinical findings..."
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 Additional Notes (optional)
 </label>
 <textarea
 rows={3}
 value={resultNotes}
 onChange={(e) => setResultNotes(e.target.value)}
 className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
 placeholder="Recommendations, follow-up instructions, or clinical notes..."
 />
 </div>

 {submitError && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
 {submitError}
 </div>
 )}

 <div className="flex gap-3 pt-2">
 <button
 onClick={() => setWriteModalOpen(false)}
 className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
 >
 Cancel
 </button>
 <button
 onClick={handleSubmitResult}
 disabled={!findings.trim() || submitting}
 className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {submitting ? (
 <>
 <FaSpinner className="animate-spin" />
 Submitting...
 </>
 ) : (
 <>
 <FaCheckCircle />
 Submit Result
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* View Result Modal */}
 {viewModalOpen && viewBooking && (
 <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
 <div className="p-5 border-b border-gray-200 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-bold text-gray-900">Test Result</h3>
 <p className="text-sm text-gray-500 mt-0.5">
 {viewBooking.testName} — {viewBooking.patientName}
 </p>
 </div>
 <button
 onClick={() => setViewModalOpen(false)}
 className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
 >
 <FaTimes />
 </button>
 </div>

 <div className="p-5 space-y-4">
 {viewBooking.resultDate && (
 <div className="text-xs text-gray-500">
 Result submitted on{' '}
 {new Date(viewBooking.resultDate).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 })}
 </div>
 )}

 <div>
 <h4 className="text-sm font-semibold text-gray-700 mb-1">Findings</h4>
 <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap border">
 {viewBooking.resultFindings || 'No findings recorded'}
 </div>
 </div>

 {viewBooking.resultNotes && (
 <div>
 <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
 <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap border border-blue-100">
 {viewBooking.resultNotes}
 </div>
 </div>
 )}

 <button
 onClick={() => setViewModalOpen(false)}
 className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
 >
 Close
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
