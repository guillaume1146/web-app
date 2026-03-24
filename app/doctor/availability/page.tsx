'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
 FaArrowLeft,
 FaSave,
 FaPlus,
 FaTrash,
 FaCalendarAlt,
 FaClock,
 FaToggleOn,
 FaToggleOff,
 FaCalendarTimes,
 FaUmbrellaBeach,
 FaCheckCircle,
 FaExclamationTriangle,
 FaSpinner
} from 'react-icons/fa'
import { getUserId } from '@/hooks/useUser'
import { useDoctorStore } from '../lib/data-store'

// Day-of-week mapping: 0=Sunday, 1=Monday, ..., 6=Saturday
const DAY_OF_WEEK_MAP: Record<string, number> = {
 Sunday: 0,
 Monday: 1,
 Tuesday: 2,
 Wednesday: 3,
 Thursday: 4,
 Friday: 5,
 Saturday: 6,
}

const DAY_FROM_INDEX: Record<number, string> = {
 0: 'Sunday',
 1: 'Monday',
 2: 'Tuesday',
 3: 'Wednesday',
 4: 'Thursday',
 5: 'Friday',
 6: 'Saturday',
}

interface TimeSlot {
 id: string
 start: string
 end: string
 isAvailable: boolean
}

interface DaySchedule {
 day: string
 isWorkingDay: boolean
 slots: TimeSlot[]
}

interface ExceptionDate {
 id: string
 date: string
 reason: string
 isAvailable: boolean
 customSlots?: TimeSlot[]
}

interface Vacation {
 id: string
 startDate: string
 endDate: string
 reason: string
}

interface ApiSlot {
 id: string
 dayOfWeek: number
 startTime: string
 endTime: string
 isActive: boolean
}

function buildDefaultSchedule(): DaySchedule[] {
 return [
 { day: 'Monday', isWorkingDay: true, slots: [
 { id: '1', start: '09:00', end: '12:00', isAvailable: true },
 { id: '2', start: '14:00', end: '18:00', isAvailable: true },
 ]},
 { day: 'Tuesday', isWorkingDay: true, slots: [
 { id: '3', start: '09:00', end: '12:00', isAvailable: true },
 { id: '4', start: '14:00', end: '18:00', isAvailable: true },
 ]},
 { day: 'Wednesday', isWorkingDay: true, slots: [
 { id: '5', start: '09:00', end: '12:00', isAvailable: true },
 { id: '6', start: '14:00', end: '18:00', isAvailable: true },
 ]},
 { day: 'Thursday', isWorkingDay: true, slots: [
 { id: '7', start: '09:00', end: '12:00', isAvailable: true },
 { id: '8', start: '14:00', end: '18:00', isAvailable: true },
 ]},
 { day: 'Friday', isWorkingDay: true, slots: [
 { id: '9', start: '09:00', end: '12:00', isAvailable: true },
 { id: '10', start: '14:00', end: '17:00', isAvailable: true },
 ]},
 { day: 'Saturday', isWorkingDay: true, slots: [
 { id: '11', start: '09:00', end: '13:00', isAvailable: true },
 ]},
 { day: 'Sunday', isWorkingDay: false, slots: [] },
 ]
}

function apiSlotsToSchedule(apiSlots: ApiSlot[]): DaySchedule[] {
 const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
 return days.map(day => {
 const dayIndex = DAY_OF_WEEK_MAP[day]
 const daySlots = apiSlots.filter(s => s.dayOfWeek === dayIndex && s.isActive)
 return {
 day,
 isWorkingDay: daySlots.length > 0,
 slots: daySlots.map((s, i) => ({
 id: s.id || `${dayIndex}-${i}`,
 start: s.startTime,
 end: s.endTime,
 isAvailable: s.isActive,
 })),
 }
 })
}

function scheduleToApiSlots(schedule: DaySchedule[]) {
 const slots: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[] = []
 for (const day of schedule) {
 if (!day.isWorkingDay) continue
 const dayOfWeek = DAY_OF_WEEK_MAP[day.day]
 for (const slot of day.slots) {
 if (slot.start && slot.end && slot.start < slot.end) {
 slots.push({
 dayOfWeek,
 startTime: slot.start,
 endTime: slot.end,
 isActive: slot.isAvailable,
 })
 }
 }
 }
 return slots
}

export default function DynamicAvailabilityPage() {
 const { updateAvailability, addException, addVacation } = useDoctorStore()

 const [activeTab, setActiveTab] = useState<'regular' | 'exceptions' | 'vacations'>('regular')
 const [showAddException, setShowAddException] = useState(false)
 const [showAddVacation, setShowAddVacation] = useState(false)
 const [regularSchedule, setRegularSchedule] = useState<DaySchedule[]>(buildDefaultSchedule())
 const [exceptions, setExceptions] = useState<ExceptionDate[]>([])
 const [vacations, setVacations] = useState<Vacation[]>([])
 const [pageLoading, setPageLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
 const [saveError, setSaveError] = useState<string | null>(null)
 const [userId, setUserId] = useState<string | null>(null)

 const [newException, setNewException] = useState({
 date: '',
 reason: '',
 isAvailable: false,
 customSlots: [] as TimeSlot[],
 })

 const [newVacation, setNewVacation] = useState({
 startDate: '',
 endDate: '',
 reason: '',
 })

 // Load userId and fetch existing availability on mount
 useEffect(() => {
 const uid = getUserId()
 if (!uid) {
 setPageLoading(false)
 return
 }
 setUserId(uid)

 const fetchAvailability = async () => {
 try {
 const res = await fetch(`/api/users/${uid}/availability`)
 if (res.ok) {
 const json = await res.json()
 if (json.success && Array.isArray(json.data) && json.data.length > 0) {
 setRegularSchedule(apiSlotsToSchedule(json.data as ApiSlot[]))
 }
 // If no data returned, keep the default schedule
 }
 } catch {
 // Keep default schedule on fetch failure
 } finally {
 setPageLoading(false)
 }
 }

 fetchAvailability()
 }, [])

 const addHours = (time: string, hours: number): string => {
 const [h, m] = time.split(':').map(Number)
 const newHour = (h + hours) % 24
 return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
 }

 const toggleDayAvailability = (dayIndex: number) => {
 const updated = [...regularSchedule]
 updated[dayIndex].isWorkingDay = !updated[dayIndex].isWorkingDay
 if (!updated[dayIndex].isWorkingDay) {
 updated[dayIndex].slots = []
 } else {
 updated[dayIndex].slots = [
 { id: Date.now().toString(), start: '09:00', end: '17:00', isAvailable: true },
 ]
 }
 setRegularSchedule(updated)
 }

 const addSlotToDay = (dayIndex: number) => {
 const updated = [...regularSchedule]
 const lastSlot = updated[dayIndex].slots[updated[dayIndex].slots.length - 1]
 const newSlot: TimeSlot = {
 id: Date.now().toString(),
 start: lastSlot ? lastSlot.end : '09:00',
 end: lastSlot ? addHours(lastSlot.end, 1) : '10:00',
 isAvailable: true,
 }
 updated[dayIndex].slots.push(newSlot)
 setRegularSchedule(updated)
 }

 const updateSlot = (dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
 const updated = [...regularSchedule]
 updated[dayIndex].slots[slotIndex][field] = value
 setRegularSchedule(updated)
 }

 const removeSlot = (dayIndex: number, slotIndex: number) => {
 const updated = [...regularSchedule]
 updated[dayIndex].slots.splice(slotIndex, 1)
 setRegularSchedule(updated)
 }

 const handleAddException = () => {
 if (newException.date && newException.reason) {
 const exception: ExceptionDate = { id: Date.now().toString(), ...newException }
 setExceptions([...exceptions, exception])
 addException({ date: newException.date, reason: newException.reason, isAvailable: newException.isAvailable })
 setNewException({ date: '', reason: '', isAvailable: false, customSlots: [] })
 setShowAddException(false)
 }
 }

 const handleAddVacation = () => {
 if (newVacation.startDate && newVacation.endDate && newVacation.reason) {
 const vacation: Vacation = { id: Date.now().toString(), ...newVacation }
 setVacations([...vacations, vacation])
 addVacation(newVacation)
 setNewVacation({ startDate: '', endDate: '', reason: '' })
 setShowAddVacation(false)
 }
 }

 const removeException = (id: string) => setExceptions(exceptions.filter(e => e.id !== id))
 const removeVacation = (id: string) => setVacations(vacations.filter(v => v.id !== id))

 const handleSaveSchedule = useCallback(async () => {
 setSaving(true)
 setSaveStatus('idle')
 setSaveError(null)

 // Also update Zustand store as a local cache
 const scheduleForStore = regularSchedule.reduce((acc, day) => {
 acc[day.day.toLowerCase()] = {
 date: day.day.toLowerCase(),
 slots: day.slots,
 isWorkingDay: day.isWorkingDay,
 }
 return acc
 }, {} as Record<string, { date: string; slots: TimeSlot[]; isWorkingDay: boolean }>)

 updateAvailability({
 regularHours: scheduleForStore,
 exceptions: exceptions.map(e => ({ date: e.date, reason: e.reason, isAvailable: e.isAvailable })),
 vacations,
 })

 if (!userId) {
 setSaveStatus('error')
 setSaveError('Not authenticated. Please log in again.')
 setSaving(false)
 return
 }

 const slots = scheduleToApiSlots(regularSchedule)

 try {
 const res = await fetch(`/api/users/${userId}/availability`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ slots }),
 })

 if (res.ok) {
 const json = await res.json()
 if (json.success) {
 setSaveStatus('success')
 // Refresh local state from API response
 if (Array.isArray(json.data) && json.data.length > 0) {
 setRegularSchedule(apiSlotsToSchedule(json.data as ApiSlot[]))
 }
 } else {
 setSaveStatus('error')
 setSaveError(json.message || 'Failed to save schedule')
 }
 } else {
 const json = await res.json().catch(() => ({}))
 setSaveStatus('error')
 setSaveError((json as { message?: string }).message || `Server error (${res.status})`)
 }
 } catch {
 setSaveStatus('error')
 setSaveError('Network error. Please check your connection and try again.')
 } finally {
 setSaving(false)
 // Auto-clear success message after 4 seconds
 if (saveStatus !== 'error') {
 setTimeout(() => setSaveStatus('idle'), 4000)
 }
 }
 }, [userId, regularSchedule, exceptions, vacations, updateAvailability, saveStatus])

 if (pageLoading) {
 return (
 <div className="min-h-screen bg-gray-50 flex items-center justify-center">
 <FaSpinner className="animate-spin text-3xl text-blue-600" />
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white shadow-sm border-b sticky top-0 z-40">
 <div className="container mx-auto px-4 py-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Link href="/doctor" className="text-gray-600 hover:text-blue-600">
 <FaArrowLeft className="text-xl" />
 </Link>
 <div>
 <h1 className="text-xl md:text-2xl font-bold text-gray-900">Availability Management</h1>
 <p className="text-sm text-gray-600">Set your working hours and manage exceptions</p>
 </div>
 </div>
 <button
 onClick={handleSaveSchedule}
 disabled={saving}
 className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
 <span className="hidden md:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
 </button>
 </div>

 {/* Save feedback */}
 {saveStatus === 'success' && (
 <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
 <FaCheckCircle />
 Schedule saved successfully!
 </div>
 )}
 {saveStatus === 'error' && (
 <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm">
 <FaExclamationTriangle />
 {saveError}
 <button
 onClick={() => setSaveStatus('idle')}
 className="ml-auto text-red-500 hover:text-red-700 font-bold"
 >
 &times;
 </button>
 </div>
 )}
 </div>
 </div>

 <div className="container mx-auto px-4 py-6 md:py-8">
 {/* Tabs */}
 <div className="bg-white rounded-xl shadow-lg mb-6">
 <div className="flex flex-col sm:flex-row border-b">
 <button
 onClick={() => setActiveTab('regular')}
 className={`flex-1 px-4 py-3 text-sm md:text-base font-medium transition ${
 activeTab === 'regular'
 ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
 : 'text-gray-600 hover:bg-gray-50'
 }`}
 >
 <FaClock className="inline mr-2" />
 Regular Hours
 </button>
 <button
 onClick={() => setActiveTab('exceptions')}
 className={`flex-1 px-4 py-3 text-sm md:text-base font-medium transition ${
 activeTab === 'exceptions'
 ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
 : 'text-gray-600 hover:bg-gray-50'
 }`}
 >
 <FaCalendarTimes className="inline mr-2" />
 Exception Dates
 </button>
 <button
 onClick={() => setActiveTab('vacations')}
 className={`flex-1 px-4 py-3 text-sm md:text-base font-medium transition ${
 activeTab === 'vacations'
 ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
 : 'text-gray-600 hover:bg-gray-50'
 }`}
 >
 <FaUmbrellaBeach className="inline mr-2" />
 Vacations
 </button>
 </div>

 <div className="p-4 md:p-6">
 {/* Regular Hours Tab */}
 {activeTab === 'regular' && (
 <div className="space-y-4">
 <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
 <p className="text-sm text-blue-800">
 Set your regular working hours for each day of the week. You can add multiple time slots per day.
 Changes are saved to the database when you click &quot;Save Changes&quot;.
 </p>
 </div>

 {regularSchedule.map((day, dayIndex) => (
 <div key={day.day} className="border rounded-lg p-4 bg-white">
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-3">
 <h3 className="font-semibold text-gray-900">{day.day}</h3>
 <button
 onClick={() => toggleDayAvailability(dayIndex)}
 className="text-2xl"
 aria-label={`Toggle ${day.day}`}
 >
 {day.isWorkingDay ? (
 <FaToggleOn className="text-green-500" />
 ) : (
 <FaToggleOff className="text-gray-400" />
 )}
 </button>
 <span className="text-sm text-gray-600">
 {day.isWorkingDay ? 'Working Day' : 'Day Off'}
 </span>
 </div>
 {day.isWorkingDay && (
 <button
 onClick={() => addSlotToDay(dayIndex)}
 className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
 >
 <FaPlus />
 Add Slot
 </button>
 )}
 </div>

 {day.isWorkingDay && (
 <div className="space-y-2">
 {day.slots.map((slot, slotIndex) => (
 <div
 key={slot.id}
 className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-3 rounded"
 >
 <div className="flex flex-1 gap-2 items-center">
 <input
 type="time"
 value={slot.start}
 onChange={(e) => updateSlot(dayIndex, slotIndex, 'start', e.target.value)}
 className="px-3 py-1 border rounded text-sm"
 />
 <span className="text-gray-600">to</span>
 <input
 type="time"
 value={slot.end}
 onChange={(e) => updateSlot(dayIndex, slotIndex, 'end', e.target.value)}
 className="px-3 py-1 border rounded text-sm"
 />
 {slot.start >= slot.end && slot.start && slot.end && (
 <span className="text-xs text-red-600">End must be after start</span>
 )}
 </div>
 <button
 onClick={() => removeSlot(dayIndex, slotIndex)}
 className="text-red-500 hover:text-red-700"
 aria-label="Remove slot"
 >
 <FaTrash />
 </button>
 </div>
 ))}
 {day.slots.length === 0 && (
 <p className="text-gray-500 text-sm">
 No time slots added. Click &quot;Add Slot&quot; to add working hours.
 </p>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 )}

 {/* Exception Dates Tab */}
 {activeTab === 'exceptions' && (
 <div>
 <div className="flex justify-between items-center mb-4">
 <p className="text-gray-600">Manage specific dates with different availability</p>
 <button
 onClick={() => setShowAddException(true)}
 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
 >
 <FaPlus />
 Add Exception
 </button>
 </div>

 <div className="space-y-3">
 {exceptions.map((exception) => (
 <div key={exception.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
 <div>
 <p className="font-medium text-gray-900">
 {new Date(exception.date).toLocaleDateString('en-US', {
 weekday: 'long',
 year: 'numeric',
 month: 'long',
 day: 'numeric',
 })}
 </p>
 <p className="text-sm text-gray-600">{exception.reason}</p>
 <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
 exception.isAvailable
 ? 'bg-green-100 text-green-800'
 : 'bg-red-100 text-red-800'
 }`}>
 {exception.isAvailable ? 'Available with custom hours' : 'Not Available'}
 </span>
 </div>
 <button onClick={() => removeException(exception.id)} className="text-red-500 hover:text-red-700">
 <FaTrash />
 </button>
 </div>
 ))}

 {exceptions.length === 0 && (
 <div className="text-center py-8 text-gray-500">
 <FaCalendarAlt className="text-4xl mx-auto mb-3 text-gray-300" />
 <p>No exception dates added</p>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Vacations Tab */}
 {activeTab === 'vacations' && (
 <div>
 <div className="flex justify-between items-center mb-4">
 <p className="text-gray-600">Manage your vacation periods</p>
 <button
 onClick={() => setShowAddVacation(true)}
 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
 >
 <FaPlus />
 Add Vacation
 </button>
 </div>

 <div className="space-y-3">
 {vacations.map((vacation) => (
 <div key={vacation.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
 <div>
 <p className="font-medium text-gray-900">
 {new Date(vacation.startDate).toLocaleDateString()} - {new Date(vacation.endDate).toLocaleDateString()}
 </p>
 <p className="text-sm text-gray-600">{vacation.reason}</p>
 <p className="text-xs text-gray-500 mt-1">
 Duration: {Math.ceil((new Date(vacation.endDate).getTime() - new Date(vacation.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
 </p>
 </div>
 <button onClick={() => removeVacation(vacation.id)} className="text-red-500 hover:text-red-700">
 <FaTrash />
 </button>
 </div>
 ))}

 {vacations.length === 0 && (
 <div className="text-center py-8 text-gray-500">
 <FaUmbrellaBeach className="text-4xl mx-auto mb-3 text-gray-300" />
 <p>No vacation periods added</p>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Add Exception Modal */}
 {showAddException && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl p-6 max-w-md w-full">
 <h3 className="text-lg font-semibold mb-4">Add Exception Date</h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
 <input
 type="date"
 value={newException.date}
 onChange={(e) => setNewException({ ...newException, date: e.target.value })}
 className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
 <input
 type="text"
 value={newException.reason}
 onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
 placeholder="e.g., Public Holiday, Conference"
 className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
 />
 </div>
 <div>
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={newException.isAvailable}
 onChange={(e) => setNewException({ ...newException, isAvailable: e.target.checked })}
 className="rounded"
 />
 <span className="text-sm text-gray-700">Available with custom hours</span>
 </label>
 </div>
 </div>
 <div className="flex gap-3 mt-6">
 <button
 onClick={() => setShowAddException(false)}
 className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 onClick={handleAddException}
 className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 Add Exception
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Add Vacation Modal */}
 {showAddVacation && (
 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-xl p-6 max-w-md w-full">
 <h3 className="text-lg font-semibold mb-4">Add Vacation Period</h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
 <input
 type="date"
 value={newVacation.startDate}
 onChange={(e) => setNewVacation({ ...newVacation, startDate: e.target.value })}
 className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
 <input
 type="date"
 value={newVacation.endDate}
 onChange={(e) => setNewVacation({ ...newVacation, endDate: e.target.value })}
 min={newVacation.startDate}
 className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
 <input
 type="text"
 value={newVacation.reason}
 onChange={(e) => setNewVacation({ ...newVacation, reason: e.target.value })}
 placeholder="e.g., Annual Leave, Medical Leave"
 className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
 />
 </div>
 </div>
 <div className="flex gap-3 mt-6">
 <button
 onClick={() => setShowAddVacation(false)}
 className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
 >
 Cancel
 </button>
 <button
 onClick={handleAddVacation}
 className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 Add Vacation
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 )
}
