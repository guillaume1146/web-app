'use client'

import { useState, useEffect, useCallback } from 'react'
import {
 FaBed, FaMoon, FaClock, FaStar, FaChevronLeft, FaChevronRight, FaPlus, FaTrash,
} from 'react-icons/fa'

interface SleepEntry {
 id: string
 durationMin: number
 quality: string
 bedtime?: string
 wakeTime?: string
 notes?: string
}

interface SleepDayData {
 entry: SleepEntry | null
 targetSleepMin: number
}

const QUALITIES = [
 { value: 'terrible', label: 'Terrible', color: 'red' },
 { value: 'poor', label: 'Poor', color: 'orange' },
 { value: 'fair', label: 'Fair', color: 'yellow' },
 { value: 'good', label: 'Good', color: 'green' },
 { value: 'excellent', label: 'Excellent', color: 'emerald' },
]

const qualityColorMap: Record<string, string> = {
 terrible: 'text-red-500',
 poor: 'text-orange-500',
 fair: 'text-yellow-500',
 good: 'text-green-500',
 excellent: 'text-emerald-500',
}

const qualityBgMap: Record<string, string> = {
 terrible: 'bg-red-100 text-red-700',
 poor: 'bg-orange-100 text-orange-700',
 fair: 'bg-yellow-100 text-yellow-700',
 good: 'bg-green-100 text-green-700',
 excellent: 'bg-emerald-100 text-emerald-700',
}

const qualityActiveMap: Record<string, string> = {
 red: 'bg-red-500 text-white',
 orange: 'bg-orange-500 text-white',
 yellow: 'bg-yellow-500 text-white',
 green: 'bg-green-500 text-white',
 emerald: 'bg-emerald-500 text-white',
}

function formatDuration(totalMin: number): string {
 const h = Math.floor(totalMin / 60)
 const m = totalMin % 60
 return `${h}h ${m}m`
}

export default function SleepTab() {
 const [selectedDate, setSelectedDate] = useState(new Date())
 const [data, setData] = useState<SleepDayData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [showAddModal, setShowAddModal] = useState(false)
 const [actionError, setActionError] = useState('')

 // Form state
 const [formHours, setFormHours] = useState(7)
 const [formMinutes, setFormMinutes] = useState(30)
 const [formQuality, setFormQuality] = useState('good')
 const [formBedtime, setFormBedtime] = useState('')
 const [formWakeTime, setFormWakeTime] = useState('')
 const [formNotes, setFormNotes] = useState('')
 const [submitting, setSubmitting] = useState(false)

 const dateStr = selectedDate.toISOString().split('T')[0]

 const fetchData = useCallback(async () => {
 try {
 setLoading(true)
 setError('')
 const res = await fetch(`/api/ai/health-tracker/sleep?date=${dateStr}`, { credentials: 'include' })
 if (!res.ok) throw new Error('Failed to load sleep data')
 const json = await res.json()
 if (!json.success) throw new Error(json.message || 'Failed to load sleep data')
 const d = json.data
 setData({
 entry: d.entry,
 targetSleepMin: d.targetSleepMin,
 })
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Something went wrong')
 } finally {
 setLoading(false)
 }
 }, [dateStr])

 useEffect(() => {
 fetchData()
 }, [fetchData])

 const handleDelete = async (id: string) => {
 try {
 const res = await fetch(`/api/ai/health-tracker/sleep/${id}`, { method: 'DELETE', credentials: 'include' })
 if (!res.ok) throw new Error('Failed to delete')
 await fetchData()
 } catch {
 setActionError('Failed to delete sleep entry')
 setTimeout(() => setActionError(''), 4000)
 await fetchData()
 }
 }

 // Auto-calculate duration from bedtime and wake time
 const autoCalculateDuration = (bedtime: string, wakeTime: string) => {
 if (!bedtime || !wakeTime) return
 const [bedH, bedM] = bedtime.split(':').map(Number)
 const [wakeH, wakeM] = wakeTime.split(':').map(Number)
 let totalMin = (wakeH * 60 + wakeM) - (bedH * 60 + bedM)
 if (totalMin <= 0) totalMin += 24 * 60 // crossed midnight
 setFormHours(Math.floor(totalMin / 60))
 setFormMinutes(totalMin % 60)
 }

 const handleBedtimeChange = (value: string) => {
 setFormBedtime(value)
 autoCalculateDuration(value, formWakeTime)
 }

 const handleWakeTimeChange = (value: string) => {
 setFormWakeTime(value)
 autoCalculateDuration(formBedtime, value)
 }

 const handleAdd = async () => {
 try {
 setSubmitting(true)
 const durationMin = formHours * 60 + formMinutes
 const res = await fetch('/api/ai/health-tracker/sleep', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 durationMin,
 quality: formQuality,
 bedtime: formBedtime || undefined,
 wakeTime: formWakeTime || undefined,
 notes: formNotes || undefined,
 date: dateStr,
 }),
 credentials: 'include',
 })
 if (!res.ok) throw new Error('Failed to log sleep')
 setShowAddModal(false)
 resetForm()
 await fetchData()
 } catch {
 setActionError('Failed to log sleep')
 setTimeout(() => setActionError(''), 4000)
 } finally {
 setSubmitting(false)
 }
 }

 const resetForm = () => {
 setFormHours(7)
 setFormMinutes(30)
 setFormQuality('good')
 setFormBedtime('')
 setFormWakeTime('')
 setFormNotes('')
 }

 const changeDate = (days: number) => {
 const newDate = new Date(selectedDate)
 newDate.setDate(newDate.getDate() + days)
 setSelectedDate(newDate)
 }

 const formatDate = (date: Date) => {
 const today = new Date()
 const yesterday = new Date(today)
 yesterday.setDate(yesterday.getDate() - 1)

 if (date.toDateString() === today.toDateString()) return 'Today'
 if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
 return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
 }

 const entry = data?.entry
 const targetMin = data?.targetSleepMin ?? 480

 return (
 <div className="p-4 space-y-4">
 {actionError && (
 <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
 <span>{actionError}</span>
 <button onClick={() => setActionError('')} className="text-red-500 hover:text-red-700 ml-2">&#10005;</button>
 </div>
 )}
 {/* Date Selector */}
 <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-3">
 <button
 onClick={() => changeDate(-1)}
 className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
 aria-label="Previous day"
 >
 <FaChevronLeft className="w-4 h-4" />
 </button>
 <span className="text-sm font-semibold text-gray-800">{formatDate(selectedDate)}</span>
 <button
 onClick={() => changeDate(1)}
 className="p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
 aria-label="Next day"
 >
 <FaChevronRight className="w-4 h-4" />
 </button>
 </div>

 {/* Summary Cards */}
 {data && (
 <div className="grid grid-cols-3 gap-3">
 <div className="bg-white rounded-lg shadow-sm p-3 text-center">
 <FaMoon className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-gray-800">
 {entry ? formatDuration(entry.durationMin) : '--'}
 </p>
 <p className="text-xs text-gray-500">Sleep Duration</p>
 </div>
 <div className="bg-white rounded-lg shadow-sm p-3 text-center">
 <FaStar className={`w-5 h-5 mx-auto mb-1 ${entry ? (qualityColorMap[entry.quality] || 'text-gray-400') : 'text-gray-400'}`} />
 {entry ? (
 <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${qualityBgMap[entry.quality] || 'bg-gray-100 text-gray-600'}`}>
 {entry.quality}
 </span>
 ) : (
 <p className="text-lg font-bold text-gray-800">--</p>
 )}
 <p className="text-xs text-gray-500 mt-1">Quality</p>
 </div>
 <div className="bg-white rounded-lg shadow-sm p-3 text-center">
 <FaClock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-gray-800">
 {entry ? formatDuration(targetMin) : '--'}
 </p>
 <p className="text-xs text-gray-500">Target</p>
 </div>
 </div>
 )}

 {/* Log Sleep Button */}
 <button
 onClick={() => setShowAddModal(true)}
 className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
 >
 <FaPlus className="w-4 h-4" />
 Log Sleep
 </button>

 {/* Loading */}
 {loading && (
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
 ))}
 </div>
 )}

 {/* Error */}
 {error && (
 <div className="text-center p-4">
 <p className="text-red-500 mb-3">{error}</p>
 <button
 onClick={fetchData}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
 >
 Retry
 </button>
 </div>
 )}

 {/* Sleep Entry */}
 {!loading && !error && (
 <div className="space-y-3">
 {!entry ? (
 <div className="text-center py-8">
 <FaBed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
 <p className="text-sm text-gray-400">No sleep logged for today</p>
 </div>
 ) : (
 <div className="bg-white rounded-lg shadow-sm p-4">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-indigo-50 rounded-lg">
 <FaBed className="w-5 h-5 text-indigo-500" />
 </div>
 <div>
 <p className="text-sm font-semibold text-gray-800">
 {formatDuration(entry.durationMin)}
 </p>
 <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${qualityBgMap[entry.quality] || 'bg-gray-100 text-gray-600'}`}>
 {entry.quality}
 </span>
 </div>
 </div>
 <button
 onClick={() => handleDelete(entry.id)}
 className="p-2 text-gray-400 hover:text-red-500 transition-colors"
 aria-label="Delete sleep entry"
 >
 <FaTrash className="w-4 h-4" />
 </button>
 </div>
 {(entry.bedtime || entry.wakeTime) && (
 <div className="mt-3 flex gap-4 text-xs text-gray-500">
 {entry.bedtime && (
 <span className="flex items-center gap-1">
 <FaMoon className="w-3 h-3" /> Bedtime: {entry.bedtime}
 </span>
 )}
 {entry.wakeTime && (
 <span className="flex items-center gap-1">
 <FaClock className="w-3 h-3" /> Wake: {entry.wakeTime}
 </span>
 )}
 </div>
 )}
 {entry.notes && (
 <p className="mt-2 text-xs text-gray-500">{entry.notes}</p>
 )}
 </div>
 )}
 </div>
 )}

 {/* Add Sleep Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60]">
 <div className="bg-white w-full md:max-w-lg md:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
 <div className="flex items-center justify-between p-4 border-b">
 <h3 className="text-lg font-semibold text-gray-800">Log Sleep</h3>
 <button
 onClick={() => { setShowAddModal(false); resetForm() }}
 className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
 >
 &times;
 </button>
 </div>
 <div className="p-4 space-y-4">
 {/* Duration: Hours and Minutes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
 <div className="flex gap-3">
 <div className="flex-1">
 <label className="block text-xs text-gray-500 mb-1">Hours</label>
 <input
 type="number"
 value={formHours}
 onChange={(e) => setFormHours(Math.max(0, Math.min(23, Number(e.target.value))))}
 min={0}
 max={23}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
 />
 </div>
 <div className="flex-1">
 <label className="block text-xs text-gray-500 mb-1">Minutes</label>
 <input
 type="number"
 value={formMinutes}
 onChange={(e) => setFormMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
 min={0}
 max={59}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
 />
 </div>
 </div>
 </div>

 {/* Quality */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
 <div className="flex gap-2">
 {QUALITIES.map((q) => (
 <button
 key={q.value}
 onClick={() => setFormQuality(q.value)}
 className={`flex-1 py-2 text-xs rounded-lg font-medium capitalize transition-colors ${
 formQuality === q.value
 ? qualityActiveMap[q.color]
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 {q.label}
 </button>
 ))}
 </div>
 </div>

 {/* Bedtime */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Bedtime (optional)</label>
 <input
 type="time"
 value={formBedtime}
 onChange={(e) => handleBedtimeChange(e.target.value)}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
 />
 </div>

 {/* Wake Time */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Wake Time (optional)</label>
 <input
 type="time"
 value={formWakeTime}
 onChange={(e) => handleWakeTimeChange(e.target.value)}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
 />
 </div>

 {/* Notes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
 <textarea
 value={formNotes}
 onChange={(e) => setFormNotes(e.target.value)}
 placeholder="How did you sleep?"
 rows={2}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
 />
 </div>

 {/* Submit */}
 <button
 onClick={handleAdd}
 disabled={submitting}
 className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
 >
 {submitting ? 'Saving...' : 'Log Sleep'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
