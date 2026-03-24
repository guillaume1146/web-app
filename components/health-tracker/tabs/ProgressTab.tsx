'use client'

import { useState, useEffect, useCallback } from 'react'
import { FaFire, FaDumbbell, FaTint, FaBalanceScale } from 'react-icons/fa'

interface WeeklyEntry {
 day: string
 calories: number
 exerciseMinutes: number
}

interface ProgressData {
 todayCalories: number
 todayBurned: number
 todayWater: number
 todayNetCalories: number
 weeklyData: WeeklyEntry[]
 weeklyAvgCalories: number
 weeklyTotalBurned: number
 weeklyNetCalories: number
 weeklyAvgWater: number
}

function WeeklyBarChart({
 data,
 dataKey,
 color,
 label,
}: {
 data: WeeklyEntry[]
 dataKey: 'calories' | 'exerciseMinutes'
 color: string
 label: string
}) {
 const values = data.map((d) => d[dataKey])
 const max = Math.max(...values, 1)

 return (
 <div className="bg-white rounded-lg shadow-sm p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-4">{label}</h3>
 <div className="flex items-end gap-2 h-32">
 {data.map((entry, i) => {
 const height = (entry[dataKey] / max) * 100
 return (
 <div key={i} className="flex-1 flex flex-col items-center gap-1">
 <span className="text-xs text-gray-500 font-medium">{entry[dataKey]}</span>
 <div className="w-full bg-gray-100 rounded-t-md relative" style={{ height: '100px' }}>
 <div
 className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${color}`}
 style={{ height: `${height}%` }}
 />
 </div>
 <span className="text-xs text-gray-400">{entry.day}</span>
 </div>
 )
 })}
 </div>
 </div>
 )
}

export default function ProgressTab() {
 const [data, setData] = useState<ProgressData | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [period, setPeriod] = useState<'week' | 'month'>('week')

 const fetchData = useCallback(async () => {
 try {
 setLoading(true)
 setError('')
 const res = await fetch(`/api/ai/health-tracker/progress?period=${period}`)
 if (!res.ok) throw new Error('Failed to load progress')
 const json = await res.json()
 if (!json.success) throw new Error(json.message || 'Failed to load progress')
 const d = json.data
 // Map API days to component's WeeklyEntry shape
 const weeklyData: WeeklyEntry[] = d.days.map((day: { date: string; caloriesConsumed: number; caloriesBurned: number; waterMl: number; exerciseMinutes: number }) => ({
 day: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
 calories: day.caloriesConsumed,
 exerciseMinutes: day.exerciseMinutes,
 }))
 // Today is the last entry in the days array
 const today = d.days[d.days.length - 1] || { caloriesConsumed: 0, caloriesBurned: 0, waterMl: 0 }
 setData({
 todayCalories: today.caloriesConsumed,
 todayBurned: today.caloriesBurned,
 todayWater: today.waterMl,
 todayNetCalories: today.caloriesConsumed - today.caloriesBurned,
 weeklyData,
 weeklyAvgCalories: d.averages.calories,
 weeklyTotalBurned: d.totals.burned,
 weeklyNetCalories: d.totals.calories - d.totals.burned,
 weeklyAvgWater: d.averages.water,
 })
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Something went wrong')
 } finally {
 setLoading(false)
 }
 }, [period])

 useEffect(() => {
 fetchData()
 }, [fetchData])

 if (loading) {
 return (
 <div className="p-4 space-y-4">
 <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
 <div className="grid grid-cols-2 gap-3">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
 ))}
 </div>
 <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
 <div className="h-48 bg-gray-200 rounded-lg animate-pulse" />
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
 <div className="p-4 space-y-4">
 {/* Period Toggle */}
 <div className="flex bg-white rounded-lg shadow-sm p-1 gap-1">
 {(['week', 'month'] as const).map((p) => (
 <button
 key={p}
 onClick={() => setPeriod(p)}
 className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
 period === p
 ? 'bg-blue-600 text-white'
 : 'text-gray-600 hover:bg-gray-100'
 }`}
 >
 {p}
 </button>
 ))}
 </div>

 {/* Today's Stats */}
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white rounded-lg shadow-sm p-3">
 <div className="flex items-center gap-2 mb-1">
 <FaFire className="w-4 h-4 text-green-500" />
 <span className="text-xs text-gray-500">Today&apos;s Calories</span>
 </div>
 <p className="text-xl font-bold text-gray-800">{data.todayCalories}</p>
 </div>
 <div className="bg-white rounded-lg shadow-sm p-3">
 <div className="flex items-center gap-2 mb-1">
 <FaDumbbell className="w-4 h-4 text-orange-500" />
 <span className="text-xs text-gray-500">Burned</span>
 </div>
 <p className="text-xl font-bold text-gray-800">{data.todayBurned}</p>
 </div>
 <div className="bg-white rounded-lg shadow-sm p-3">
 <div className="flex items-center gap-2 mb-1">
 <FaTint className="w-4 h-4 text-blue-500" />
 <span className="text-xs text-gray-500">Water</span>
 </div>
 <p className="text-xl font-bold text-gray-800">{data.todayWater} ml</p>
 </div>
 <div className="bg-white rounded-lg shadow-sm p-3">
 <div className="flex items-center gap-2 mb-1">
 <FaBalanceScale className="w-4 h-4 text-purple-500" />
 <span className="text-xs text-gray-500">Net Calories</span>
 </div>
 <p className="text-xl font-bold text-gray-800">{data.todayNetCalories}</p>
 </div>
 </div>

 {/* Weekly Calorie Intake Chart */}
 <WeeklyBarChart
 data={data.weeklyData}
 dataKey="calories"
 color="bg-green-500"
 label="Weekly Calorie Intake"
 />

 {/* Weekly Activity Chart */}
 <WeeklyBarChart
 data={data.weeklyData}
 dataKey="exerciseMinutes"
 color="bg-purple-500"
 label="Weekly Activity (minutes)"
 />

 {/* Weekly Insights */}
 <div className="bg-white rounded-lg shadow-sm p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Weekly Insights</h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Weekly Average Calories</span>
 <span className="text-sm font-semibold text-gray-800">{data.weeklyAvgCalories} cal</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Total Burned This Week</span>
 <span className="text-sm font-semibold text-orange-600">{data.weeklyTotalBurned} cal</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Net Weekly Calories</span>
 <span className={`text-sm font-semibold ${data.weeklyNetCalories > 0 ? 'text-red-600' : 'text-green-600'}`}>
 {data.weeklyNetCalories > 0 ? '+' : ''}{data.weeklyNetCalories} cal
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-sm text-gray-600">Average Water Intake</span>
 <span className="text-sm font-semibold text-blue-600">{data.weeklyAvgWater} ml</span>
 </div>
 </div>
 </div>
 </div>
 )
}
