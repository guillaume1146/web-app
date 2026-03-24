'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaPlus, FaSpinner, FaCalendarDay, FaUtensils } from 'react-icons/fa'

interface MealPlanMeal {
 id: string
 name: string
 mealType: string
 calories: number
 protein: number
 carbs: number
 fat: number
 description?: string
}

interface MealPlanDay {
 day: string
 meals: MealPlanMeal[]
 totalCalories: number
 totalProtein: number
 totalCarbs: number
 totalFat: number
}

interface MealPlanData {
 days: MealPlanDay[]
 targetCalories: number
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function MealPlanDayCard({
 meal,
 onAddToDiary,
 adding,
}: {
 meal: MealPlanMeal
 onAddToDiary: (meal: MealPlanMeal) => void
 adding: boolean
}) {
 return (
 <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-400">
 <div className="flex items-start justify-between gap-2">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <h4 className="text-sm font-bold text-gray-800 truncate">{meal.name}</h4>
 <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize whitespace-nowrap">
 {meal.mealType}
 </span>
 </div>
 {meal.description && (
 <p className="text-xs text-gray-500 mt-1 line-clamp-2">{meal.description}</p>
 )}
 <div className="flex items-center gap-3 mt-1.5">
 <span className="text-xs font-semibold text-gray-700">{meal.calories} cal</span>
 <span className="text-xs text-gray-500">P: {meal.protein}g</span>
 <span className="text-xs text-gray-500">C: {meal.carbs}g</span>
 <span className="text-xs text-gray-500">F: {meal.fat}g</span>
 </div>
 </div>
 <button
 onClick={() => onAddToDiary(meal)}
 disabled={adding}
 className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
 aria-label={`Add ${meal.name} to diary`}
 >
 <FaPlus className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 )
}

export default function MealPlannerTab() {
 const [data, setData] = useState<MealPlanData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [selectedDay, setSelectedDay] = useState(0) // index into DAYS_OF_WEEK
 const [generating, setGenerating] = useState(false)
 const [addingMealId, setAddingMealId] = useState<string | null>(null)

 const getWeekStart = () => {
 const now = new Date()
 const dayOfWeek = now.getDay()
 const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
 const monday = new Date(now)
 monday.setDate(now.getDate() + diff)
 return monday.toISOString().split('T')[0]
 }

 const fetchData = useCallback(async () => {
 try {
 setLoading(true)
 setError('')
 const weekStart = getWeekStart()
 const res = await fetch(`/api/ai/health-tracker/meal-plan?weekStart=${weekStart}`)
 if (!res.ok) throw new Error('Failed to load meal plan')
 const json = await res.json()
 if (!json.success) throw new Error(json.message || 'Failed to load meal plan')
 const d = json.data
 // Map API grouped structure to component's MealPlanDay[] shape
 const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
 const days: MealPlanDay[] = dayNames.map((name, index) => {
 const dayMeals = d.days[index] || {}
 const meals: MealPlanMeal[] = [
 ...(dayMeals.breakfast || []),
 ...(dayMeals.lunch || []),
 ...(dayMeals.dinner || []),
 ...(dayMeals.snack || []),
 ]
 const totals = d.dailyTotals?.[index] || { calories: 0, protein: 0, carbs: 0, fat: 0 }
 return {
 day: name,
 meals,
 totalCalories: totals.calories,
 totalProtein: totals.protein,
 totalCarbs: totals.carbs,
 totalFat: totals.fat,
 }
 })
 setData({ days, targetCalories: 2000 })
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Something went wrong')
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => {
 fetchData()
 }, [fetchData])

 const handleGenerate = async () => {
 try {
 setGenerating(true)
 setError('')
 const res = await fetch('/api/ai/health-tracker/meal-plan/generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ weekStart: getWeekStart() }),
 })
 if (!res.ok) throw new Error('Failed to generate meal plan')
 await fetchData()
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to generate')
 } finally {
 setGenerating(false)
 }
 }

 const handleAddToDiary = async (meal: MealPlanMeal) => {
 try {
 setAddingMealId(meal.id)
 const today = new Date().toISOString().split('T')[0]
 const res = await fetch('/api/ai/health-tracker/meal-plan/add-to-diary', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 mealPlanEntryId: meal.id,
 date: today,
 }),
 })
 if (!res.ok) throw new Error('Failed to add to diary')
 } catch {
 setError('Failed to add meal to diary')
 setTimeout(() => setError(''), 4000)
 } finally {
 setAddingMealId(null)
 }
 }

 const currentDay = data?.days?.[selectedDay]

 if (loading) {
 return (
 <div className="p-4 space-y-4">
 <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
 <div className="flex gap-2">
 {DAYS_OF_WEEK.map((d) => (
 <div key={d} className="h-10 flex-1 bg-gray-200 rounded-lg animate-pulse" />
 ))}
 </div>
 <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
 ))}
 </div>
 )
 }

 if (error && !data) {
 return (
 <div className="p-4 text-center">
 <p className="text-red-500 mb-3">{error}</p>
 <button
 onClick={fetchData}
 className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
 >
 Retry
 </button>
 </div>
 )
 }

 return (
 <div className="p-4 space-y-4">
 {/* Target Calories Banner */}
 {data && (
 <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <FaCalendarDay className="w-4 h-4 text-green-600" />
 <span className="text-sm font-medium text-green-800">Daily Target</span>
 </div>
 <span className="text-sm font-bold text-green-700">{data.targetCalories} cal</span>
 </div>
 )}

 {/* Day Tabs */}
 <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1 overflow-x-auto">
 {DAYS_OF_WEEK.map((day, index) => (
 <button
 key={day}
 onClick={() => setSelectedDay(index)}
 className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors min-w-[40px] ${
 selectedDay === index
 ? 'bg-green-600 text-white'
 : 'text-gray-600 hover:bg-gray-100'
 }`}
 >
 {day}
 </button>
 ))}
 </div>

 {/* Today's Plan Macros */}
 {currentDay && currentDay.meals.length > 0 && (
 <div className="bg-white rounded-lg shadow-sm p-3">
 <div className="grid grid-cols-4 gap-2 text-center">
 <div>
 <p className="text-lg font-bold text-gray-800">{currentDay.totalCalories}</p>
 <p className="text-xs text-gray-500">Calories</p>
 </div>
 <div>
 <p className="text-lg font-bold text-blue-600">{currentDay.totalProtein}g</p>
 <p className="text-xs text-gray-500">Protein</p>
 </div>
 <div>
 <p className="text-lg font-bold text-amber-600">{currentDay.totalCarbs}g</p>
 <p className="text-xs text-gray-500">Carbs</p>
 </div>
 <div>
 <p className="text-lg font-bold text-pink-600">{currentDay.totalFat}g</p>
 <p className="text-xs text-gray-500">Fat</p>
 </div>
 </div>
 </div>
 )}

 {/* Generate Button */}
 <button
 onClick={handleGenerate}
 disabled={generating}
 className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
 >
 {generating ? (
 <>
 <FaSpinner className="w-4 h-4 animate-spin" />
 Generating...
 </>
 ) : (
 <>
 <FaUtensils className="w-4 h-4" />
 Generate New Plan
 </>
 )}
 </button>

 {error && (
 <p className="text-sm text-red-500 text-center">{error}</p>
 )}

 {/* Meals for Selected Day */}
 {!currentDay || currentDay.meals.length === 0 ? (
 <div className="text-center py-8">
 <FaCalendarDay className="w-10 h-10 text-gray-300 mx-auto mb-3" />
 <p className="text-sm text-gray-400">No meal plan yet. Generate one!</p>
 </div>
 ) : (
 <div className="space-y-3">
 {currentDay.meals.map((meal) => (
 <MealPlanDayCard
 key={meal.id}
 meal={meal}
 onAddToDiary={handleAddToDiary}
 adding={addingMealId === meal.id}
 />
 ))}
 </div>
 )}
 </div>
 )
}
