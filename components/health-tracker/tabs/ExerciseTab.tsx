'use client'

import { useState, useEffect, useCallback } from 'react'
import {
 FaChevronLeft, FaChevronRight, FaPlus, FaFire, FaClock, FaDumbbell,
} from 'react-icons/fa'
import ExerciseEntryCard from '../shared/ExerciseEntryCard'

interface ExerciseEntry {
 id: string
 exerciseType: string
 durationMin: number
 caloriesBurned: number
 intensity: string
 notes?: string
}

interface ExerciseDayData {
 entries: ExerciseEntry[]
 totalBurned: number
 totalMinutes: number
}

const EXERCISE_TYPES = [
 'Walking', 'Running', 'Cycling', 'Swimming', 'Yoga',
 'Weight Training', 'HIIT', 'Dancing', 'Sports', 'Other',
]

const INTENSITIES = ['light', 'moderate', 'vigorous']

export default function ExerciseTab() {
 const [selectedDate, setSelectedDate] = useState(new Date())
 const [data, setData] = useState<ExerciseDayData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [showAddModal, setShowAddModal] = useState(false)
 const [actionError, setActionError] = useState('')

 // Form state
 const [formExerciseType, setFormExerciseType] = useState('Walking')
 const [formDuration, setFormDuration] = useState(30)
 const [formCalories, setFormCalories] = useState(150)
 const [formIntensity, setFormIntensity] = useState('moderate')
 const [formNotes, setFormNotes] = useState('')
 const [submitting, setSubmitting] = useState(false)

 const dateStr = selectedDate.toISOString().split('T')[0]

 const fetchData = useCallback(async () => {
 try {
 setLoading(true)
 setError('')
 const res = await fetch(`/api/ai/health-tracker/exercise?date=${dateStr}`, { credentials: 'include' })
 if (!res.ok) throw new Error('Failed to load exercises')
 const json = await res.json()
 if (!json.success) throw new Error(json.message || 'Failed to load exercises')
 const d = json.data
 setData({
 entries: d.entries,
 totalBurned: d.totalCaloriesBurned,
 totalMinutes: d.totalMinutes,
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
 const res = await fetch(`/api/ai/health-tracker/exercise/${id}`, { method: 'DELETE', credentials: 'include' })
 if (!res.ok) throw new Error('Failed to delete')
 await fetchData()
 } catch {
 setActionError('Failed to delete exercise')
 setTimeout(() => setActionError(''), 4000)
 await fetchData()
 }
 }

 const handleAdd = async () => {
 try {
 setSubmitting(true)
 const res = await fetch('/api/ai/health-tracker/exercise', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 exerciseType: formExerciseType,
 durationMin: formDuration,
 caloriesBurned: formCalories,
 intensity: formIntensity,
 notes: formNotes || undefined,
 date: dateStr,
 }),
 credentials: 'include',
 })
 if (!res.ok) throw new Error('Failed to log exercise')
 setShowAddModal(false)
 resetForm()
 await fetchData()
 } catch {
 setActionError('Failed to log exercise')
 setTimeout(() => setActionError(''), 4000)
 } finally {
 setSubmitting(false)
 }
 }

 const resetForm = () => {
 setFormExerciseType('Walking')
 setFormDuration(30)
 setFormCalories(150)
 setFormIntensity('moderate')
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
 <FaFire className="w-5 h-5 text-orange-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-gray-800">{data.totalBurned}</p>
 <p className="text-xs text-gray-500">Total Burned</p>
 </div>
 <div className="bg-white rounded-lg shadow-sm p-3 text-center">
 <FaClock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-gray-800">{data.totalMinutes}</p>
 <p className="text-xs text-gray-500">Total Minutes</p>
 </div>
 <div className="bg-white rounded-lg shadow-sm p-3 text-center">
 <FaDumbbell className="w-5 h-5 text-purple-500 mx-auto mb-1" />
 <p className="text-lg font-bold text-gray-800">{data.entries.length}</p>
 <p className="text-xs text-gray-500">Exercises</p>
 </div>
 </div>
 )}

 {/* Log Exercise Button */}
 <button
 onClick={() => setShowAddModal(true)}
 className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
 >
 <FaPlus className="w-4 h-4" />
 Log Exercise
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

 {/* Exercise List */}
 {!loading && !error && (
 <div className="space-y-3">
 {data?.entries.length === 0 ? (
 <div className="text-center py-8">
 <FaDumbbell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
 <p className="text-sm text-gray-400">No exercises logged for today</p>
 </div>
 ) : (
 data?.entries.map((entry) => (
 <ExerciseEntryCard
 key={entry.id}
 id={entry.id}
 exerciseType={entry.exerciseType}
 durationMin={entry.durationMin}
 caloriesBurned={entry.caloriesBurned}
 intensity={entry.intensity}
 notes={entry.notes}
 onDelete={handleDelete}
 />
 ))
 )}
 </div>
 )}

 {/* Add Exercise Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60]">
 <div className="bg-white w-full md:max-w-lg md:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
 <div className="flex items-center justify-between p-4 border-b">
 <h3 className="text-lg font-semibold text-gray-800">Log Exercise</h3>
 <button
 onClick={() => { setShowAddModal(false); resetForm() }}
 className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
 >
 &times;
 </button>
 </div>
 <div className="p-4 space-y-4">
 {/* Exercise Type */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Exercise Type</label>
 <select
 value={formExerciseType}
 onChange={(e) => setFormExerciseType(e.target.value)}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
 >
 {EXERCISE_TYPES.map((type) => (
 <option key={type} value={type}>{type}</option>
 ))}
 </select>
 </div>

 {/* Duration */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
 <input
 type="number"
 value={formDuration}
 onChange={(e) => setFormDuration(Number(e.target.value))}
 min={1}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
 />
 </div>

 {/* Calories Burned */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Calories Burned</label>
 <input
 type="number"
 value={formCalories}
 onChange={(e) => setFormCalories(Number(e.target.value))}
 min={0}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
 />
 </div>

 {/* Intensity */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Intensity</label>
 <div className="flex gap-2">
 {INTENSITIES.map((level) => (
 <button
 key={level}
 onClick={() => setFormIntensity(level)}
 className={`flex-1 py-2 text-sm rounded-lg font-medium capitalize transition-colors ${
 formIntensity === level
 ? level === 'light'
 ? 'bg-green-600 text-white'
 : level === 'moderate'
 ? 'bg-yellow-500 text-white'
 : 'bg-red-600 text-white'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 {level}
 </button>
 ))}
 </div>
 </div>

 {/* Notes */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
 <textarea
 value={formNotes}
 onChange={(e) => setFormNotes(e.target.value)}
 placeholder="How did it go?"
 rows={2}
 className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
 />
 </div>

 {/* Submit */}
 <button
 onClick={handleAdd}
 disabled={submitting}
 className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
 >
 {submitting ? 'Saving...' : 'Log Exercise'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
