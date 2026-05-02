'use client'

import { useState, useEffect, useCallback } from 'react'
import {
 FaChevronLeft, FaChevronRight, FaPlus, FaCamera,
 FaCoffee, FaSun, FaMoon, FaCookieBite,
} from 'react-icons/fa'
import FoodEntryCard from '../shared/FoodEntryCard'
import FoodSearchPanel, { FoodSearchResult } from '../shared/FoodSearchPanel'
import FoodScanPanel from '../shared/FoodScanPanel'

interface FoodEntry {
 id: string
 name: string
 calories: number
 protein: number
 carbs: number
 fat: number
 mealType: string
 time: string
}

interface FoodDayData {
 entries: FoodEntry[]
 totalCalories: number
 targetCalories: number
}

const MEAL_TYPES = [
 { key: 'breakfast', label: 'Breakfast', icon: FaCoffee, color: 'text-amber-500' },
 { key: 'lunch', label: 'Lunch', icon: FaSun, color: 'text-orange-500' },
 { key: 'dinner', label: 'Dinner', icon: FaMoon, color: 'text-indigo-500' },
 { key: 'snack', label: 'Snack', icon: FaCookieBite, color: 'text-pink-500' },
]

export default function FoodDiaryTab() {
 const [selectedDate, setSelectedDate] = useState(new Date())
 const [data, setData] = useState<FoodDayData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [showAddModal, setShowAddModal] = useState(false)
 const [addMealType, setAddMealType] = useState('breakfast')
 const [addTab, setAddTab] = useState<'search' | 'scan'>('search')
 const [actionError, setActionError] = useState('')

 const dateStr = selectedDate.toISOString().split('T')[0]

 const fetchData = useCallback(async () => {
 try {
 setLoading(true)
 setError('')
 const res = await fetch(`/api/ai/health-tracker/food?date=${dateStr}`, { credentials: 'include' })
 if (!res.ok) throw new Error('Failed to load food diary')
 const json = await res.json()
 if (!json.success) throw new Error(json.message || 'Failed to load food diary')
 const d = json.data
 // Flatten grouped meals into a single entries array
 const entries: FoodEntry[] = [
 ...(d.breakfast || []),
 ...(d.lunch || []),
 ...(d.dinner || []),
 ...(d.snack || []),
 ]
 setData({
 entries,
 totalCalories: d.totalCalories ?? 0,
 targetCalories: d.targetCalories ?? 2000,
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
 const res = await fetch(`/api/ai/health-tracker/food/${id}`, { method: 'DELETE', credentials: 'include' })
 if (!res.ok) throw new Error('Failed to delete')
 await fetchData()
 } catch {
 setActionError('Failed to delete food entry')
 setTimeout(() => setActionError(''), 4000)
 await fetchData()
 }
 }

 const handleAddFood = async (food: FoodSearchResult) => {
 try {
 const res = await fetch('/api/ai/health-tracker/food', {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 foodId: food.id,
 name: food.name,
 calories: food.calories,
 protein: food.protein,
 carbs: food.carbs,
 fat: food.fat,
 mealType: addMealType,
 date: dateStr,
 }),
 })
 if (!res.ok) throw new Error('Failed to add food')
 setShowAddModal(false)
 await fetchData()
 } catch {
 setActionError('Failed to add food entry')
 setTimeout(() => setActionError(''), 4000)
 }
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

 const getEntriesForMeal = (mealType: string) =>
 data?.entries.filter((e) => e.mealType === mealType) || []

 const getMealCalories = (mealType: string) =>
 getEntriesForMeal(mealType).reduce((sum, e) => sum + e.calories, 0)

 const openAddModal = (mealType: string) => {
 setAddMealType(mealType)
 setShowAddModal(true)
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

 {/* Daily Summary */}
 {data && (
 <div className="bg-white rounded-lg shadow-sm p-4 text-center">
 <p className="text-sm text-gray-500">Daily Calories</p>
 <p className="text-2xl font-bold text-gray-800">
 {data.totalCalories}
 <span className="text-sm font-normal text-gray-400"> / {data.targetCalories} cal</span>
 </p>
 </div>
 )}

 {loading && (
 <div className="space-y-4">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
 <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
 <div className="h-12 bg-gray-200 rounded" />
 </div>
 ))}
 </div>
 )}

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

 {/* Meal Sections */}
 {!loading && !error && MEAL_TYPES.map((meal) => {
 const entries = getEntriesForMeal(meal.key)
 const mealCals = getMealCalories(meal.key)
 const Icon = meal.icon

 return (
 <div key={meal.key} className="bg-white rounded-lg shadow-sm overflow-hidden">
 {/* Section Header */}
 <div className="flex items-center justify-between p-3 border-b border-gray-50">
 <div className="flex items-center gap-2">
 <Icon className={`w-4 h-4 ${meal.color}`} />
 <span className="text-sm font-semibold text-gray-800">{meal.label}</span>
 {mealCals > 0 && (
 <span className="text-xs text-gray-400">{mealCals} cal</span>
 )}
 </div>
 <button
 onClick={() => openAddModal(meal.key)}
 className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
 aria-label={`Add ${meal.label}`}
 >
 <FaPlus className="w-3.5 h-3.5" />
 </button>
 </div>

 {/* Entries */}
 <div className="p-3 space-y-2">
 {entries.length === 0 ? (
 <p className="text-sm text-gray-400 text-center py-2">
 No {meal.label.toLowerCase()} logged
 </p>
 ) : (
 entries.map((entry) => (
 <FoodEntryCard
 key={entry.id}
 id={entry.id}
 name={entry.name}
 calories={entry.calories}
 protein={entry.protein}
 carbs={entry.carbs}
 fat={entry.fat}
 time={entry.time}
 onDelete={handleDelete}
 />
 ))
 )}
 </div>
 </div>
 )
 })}

 {/* Add Food Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[60]">
 <div className="bg-white w-full md:max-w-lg md:rounded-lg rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
 <div className="flex items-center justify-between p-4 border-b">
 <h3 className="text-lg font-semibold text-gray-800">
 Add {MEAL_TYPES.find((m) => m.key === addMealType)?.label || 'Food'}
 </h3>
 <button
 onClick={() => setShowAddModal(false)}
 className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
 >
 &times;
 </button>
 </div>
 <div className="p-4">
 {/* Meal type selector */}
 <div className="flex gap-2 mb-4 overflow-x-auto">
 {MEAL_TYPES.map((meal) => (
 <button
 key={meal.key}
 onClick={() => setAddMealType(meal.key)}
 className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
 addMealType === meal.key
 ? 'bg-blue-600 text-white'
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
 }`}
 >
 {meal.label}
 </button>
 ))}
 </div>

 {/* Search / AI Scan tabs */}
 <div className="flex border-b border-gray-200 mb-4">
 <button
 onClick={() => setAddTab('search')}
 className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
 addTab === 'search'
 ? 'text-blue-600 border-b-2 border-blue-600'
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 <FaPlus className="inline mr-1.5 text-xs" />
 Search Food
 </button>
 <button
 onClick={() => setAddTab('scan')}
 className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
 addTab === 'scan'
 ? 'text-blue-600 border-b-2 border-blue-600'
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 <FaCamera className="inline mr-1.5 text-xs" />
 AI Scan
 </button>
 </div>

 {addTab === 'search' && (
 <FoodSearchPanel onSelect={handleAddFood} />
 )}

 {addTab === 'scan' && (
 <FoodScanPanel
 onResult={(food) => {
 handleAddFood({
 id: '',
 name: food.name,
 calories: food.calories,
 protein: food.protein,
 carbs: food.carbs,
 fat: food.fat,
 } as FoodSearchResult)
 }}
 />
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
