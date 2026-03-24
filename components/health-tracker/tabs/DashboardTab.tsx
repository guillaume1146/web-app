'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaUtensils, FaDumbbell, FaTint, FaSync } from 'react-icons/fa'
import CircularProgress from '../shared/CircularProgress'
import WaterTracker from '../shared/WaterTracker'
import GoalProgressBar from '../shared/GoalProgressBar'

interface DashboardData {
 calories: { consumed: number; target: number; burned: number }
 water: { consumed: number; target: number }
 exercise: { minutes: number; targetMinutes: number; caloriesBurned: number }
}

interface DashboardTabProps {
 onNavigateToTab?: (tabIndex: number) => void
}

export default function DashboardTab({ onNavigateToTab }: DashboardTabProps) {
 const [data, setData] = useState<DashboardData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 const fetchData = useCallback(async () => {
 try {
 setLoading(true)
 setError('')
 const res = await fetch('/api/ai/health-tracker/dashboard')
 if (!res.ok) throw new Error('Failed to load dashboard')
 const json = await res.json()
 if (!json.success) throw new Error(json.message || 'Failed to load dashboard')
 const d = json.data
 setData({
 calories: { consumed: d.caloriesConsumed, target: d.targetCalories, burned: d.caloriesBurned },
 water: { consumed: d.waterConsumedMl, target: d.waterTargetMl },
 exercise: { minutes: d.exerciseMinutes, targetMinutes: d.exerciseTargetMin, caloriesBurned: d.caloriesBurned },
 })
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Something went wrong')
 } finally {
 setLoading(false)
 }
 }, [])

 useEffect(() => {
 fetchData()
 }, [fetchData])

 const handleAddWater = async () => {
 try {
 const res = await fetch('/api/ai/health-tracker/water', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ amountMl: 250 }),
 })
 if (!res.ok) throw new Error('Failed to log water')
 await fetchData()
 } catch {
 setError('Failed to log water')
 setTimeout(() => setError(''), 4000)
 }
 }

 if (loading) {
 return (
 <div className="p-4 space-y-4">
 <div className="flex justify-center">
 <div className="w-48 h-48 bg-gray-200 rounded-full animate-pulse" />
 </div>
 <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-10 bg-gray-200 rounded-lg animate-pulse" />
 ))}
 </div>
 <div className="grid grid-cols-3 gap-3">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
 ))}
 </div>
 </div>
 )
 }

 if (error) {
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

 if (!data) return null

 return (
 <div className="p-4 space-y-6">
 {/* Header with refresh */}
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-bold text-gray-800">Daily Summary</h2>
 <button
 onClick={fetchData}
 className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-100"
 aria-label="Refresh dashboard"
 >
 <FaSync className="w-4 h-4" />
 </button>
 </div>

 {/* Calorie Progress */}
 <div className="flex justify-center">
 <CircularProgress
 consumed={data.calories.consumed}
 target={data.calories.target}
 burned={data.calories.burned}
 />
 </div>

 {/* Water Tracker */}
 <WaterTracker
 consumed={data.water.consumed}
 target={data.water.target}
 onAddGlass={handleAddWater}
 />

 {/* Activity Summary */}
 <div className="bg-white rounded-lg shadow-sm p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Summary</h3>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-purple-50 rounded-lg p-3 text-center">
 <p className="text-2xl font-bold text-purple-600">{data.exercise.minutes}</p>
 <p className="text-xs text-gray-500">Exercise Minutes</p>
 </div>
 <div className="bg-orange-50 rounded-lg p-3 text-center">
 <p className="text-2xl font-bold text-orange-600">{data.exercise.caloriesBurned}</p>
 <p className="text-xs text-gray-500">Calories Burned</p>
 </div>
 </div>
 </div>

 {/* Goal Progress */}
 <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
 <h3 className="text-sm font-semibold text-gray-700">Goals</h3>
 <GoalProgressBar
 label="Calories"
 current={data.calories.consumed}
 target={data.calories.target}
 unit="cal"
 color="bg-green-500"
 />
 <GoalProgressBar
 label="Water"
 current={data.water.consumed}
 target={data.water.target}
 unit="ml"
 color="bg-blue-500"
 />
 <GoalProgressBar
 label="Exercise"
 current={data.exercise.minutes}
 target={data.exercise.targetMinutes}
 unit="min"
 color="bg-purple-500"
 />
 </div>

 {/* Quick Actions */}
 <div className="bg-white rounded-lg shadow-sm p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
 <div className="grid grid-cols-3 gap-3">
 <button
 onClick={() => onNavigateToTab?.(1)}
 className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
 >
 <FaUtensils className="w-5 h-5 text-blue-600" />
 <span className="text-xs font-medium text-blue-700">Log Meal</span>
 </button>
 <button
 onClick={() => onNavigateToTab?.(2)}
 className="flex flex-col items-center gap-1.5 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
 >
 <FaDumbbell className="w-5 h-5 text-purple-600" />
 <span className="text-xs font-medium text-purple-700">Log Exercise</span>
 </button>
 <button
 onClick={handleAddWater}
 className="flex flex-col items-center gap-1.5 p-3 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors"
 >
 <FaTint className="w-5 h-5 text-cyan-600" />
 <span className="text-xs font-medium text-cyan-700">Log Water</span>
 </button>
 </div>
 </div>
 </div>
 )
}
