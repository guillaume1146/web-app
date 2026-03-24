'use client'

import { useState } from 'react'
import {
 FaChartPie, FaUtensils, FaDumbbell, FaBed, FaRobot,
 FaChartLine, FaCalendarAlt, FaUser, FaHeartbeat,
} from 'react-icons/fa'
import { useCapacitor } from '@/hooks/useCapacitor'

import DashboardTab from './tabs/DashboardTab'
import FoodDiaryTab from './tabs/FoodDiaryTab'
import ExerciseTab from './tabs/ExerciseTab'
import SleepTab from './tabs/SleepTab'
import AiCoachTab from './tabs/AiCoachTab'
import ProgressTab from './tabs/ProgressTab'
import MealPlannerTab from './tabs/MealPlannerTab'
import ProfileGoalsTab from './tabs/ProfileGoalsTab'
import BloodPressureScanner from './BloodPressureScanner'

interface HealthTrackerTabsProps {
 userName?: string
 healthScore?: number
}

const TABS = [
 { id: 'dashboard', label: 'Dashboard', icon: FaChartPie },
 { id: 'food', label: 'Food Diary', icon: FaUtensils },
 { id: 'exercise', label: 'Exercise', icon: FaDumbbell },
 { id: 'sleep', label: 'Sleep', icon: FaBed },
 { id: 'ai-coach', label: 'AI Coach', icon: FaRobot },
 { id: 'progress', label: 'Progress', icon: FaChartLine },
 { id: 'meal-plan', label: 'Meal Plan', icon: FaCalendarAlt },
 { id: 'profile', label: 'Profile', icon: FaUser },
 { id: 'bp-check', label: 'BP Check', icon: FaHeartbeat },
]

export default function HealthTrackerTabs({ userName, healthScore }: HealthTrackerTabsProps) {
 const [activeTab, setActiveTab] = useState(0)
 const isCapacitor = useCapacitor()

 const renderTab = () => {
 switch (activeTab) {
 case 0: return <DashboardTab onNavigateToTab={setActiveTab} />
 case 1: return <FoodDiaryTab />
 case 2: return <ExerciseTab />
 case 3: return <SleepTab />
 case 4: return <AiCoachTab userName={userName} healthScore={healthScore} />
 case 5: return <ProgressTab />
 case 6: return <MealPlannerTab />
 case 7: return <ProfileGoalsTab />
 case 8: return <BloodPressureScanner />
 default: return <DashboardTab onNavigateToTab={setActiveTab} />
 }
 }

 return (
 <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
 {/* Desktop: Top tabs */}
 <div className="hidden md:flex items-center gap-1 bg-white border-b px-4 py-2 overflow-x-auto">
 {TABS.map((tab, index) => {
 const Icon = tab.icon
 const isActive = activeTab === index
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(index)}
 className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
 isActive
 ? 'bg-blue-600 text-white'
 : 'text-gray-600 hover:bg-gray-100'
 }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 </button>
 )
 })}
 </div>

 {/* Tab content */}
 <div className={`flex-1 overflow-y-auto bg-gray-50 ${isCapacitor ? 'pb-32' : 'pb-20'} md:pb-4`}>
 {renderTab()}
 </div>

 {/* Mobile: Bottom tabs */}
 <div className={`md:hidden fixed left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-1 z-50 shadow-lg ${isCapacitor ? 'bottom-0 pt-2 pb-8' : 'bottom-0 py-2'}`}>
 {TABS.map((tab, index) => {
 const Icon = tab.icon
 const isActive = activeTab === index
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(index)}
 className={`flex flex-col items-center justify-center p-2 min-w-[44px] min-h-[44px] ${
 isActive ? 'text-blue-600' : 'text-gray-400'
 }`}
 >
 <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 {isActive && (
 <div className="w-1 h-1 bg-blue-600 rounded-full mt-1" />
 )}
 </button>
 )
 })}
 </div>
 </div>
 )
}
