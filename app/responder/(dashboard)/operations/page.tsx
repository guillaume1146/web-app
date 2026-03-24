'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FaClipboardList, FaPhoneAlt, FaMapMarkerAlt, FaAmbulance } from 'react-icons/fa'

// Lazy load each tab's content from existing pages (zero duplication)
const BookingRequestsContent = dynamic(() => import('../booking-requests/page'), { ssr: false, loading: () => <TabLoading /> })
const EmergencyCallsContent = dynamic(() => import('../calls/page'), { ssr: false, loading: () => <TabLoading /> })
const CoverageContent = dynamic(() => import('../coverage/page'), { ssr: false, loading: () => <TabLoading /> })
const ServicesContent = dynamic(() => import('../services/page'), { ssr: false, loading: () => <TabLoading /> })

function TabLoading() {
 return (
 <div className="flex items-center justify-center py-20">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
 </div>
 )
}

const TABS = [
 { id: 'booking-requests', label: 'Requests', icon: FaClipboardList },
 { id: 'calls', label: 'Calls', icon: FaPhoneAlt },
 { id: 'coverage', label: 'Coverage', icon: FaMapMarkerAlt },
 { id: 'services', label: 'Services', icon: FaAmbulance },
] as const

type TabId = typeof TABS[number]['id']

export default function ResponderOperationsPage() {
 const [activeTab, setActiveTab] = useState<TabId>('booking-requests')

 return (
 <div className="pb-20 sm:pb-0">
 {/* Desktop tab bar */}
 <div className="hidden sm:block border-b border-gray-200 bg-white rounded-t-xl mb-0">
 <div className="flex overflow-x-auto">
 {TABS.map((tab) => {
 const Icon = tab.icon
 const isActive = activeTab === tab.id
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
 isActive
 ? 'border-red-600 text-red-600'
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`}
 >
 <Icon className={isActive ? 'text-red-600' : 'text-gray-400'} />
 {tab.label}
 </button>
 )
 })}
 </div>
 </div>

 {/* Tab content */}
 <div>
 {activeTab === 'booking-requests' && <BookingRequestsContent />}
 {activeTab === 'calls' && <EmergencyCallsContent />}
 {activeTab === 'coverage' && <CoverageContent />}
 {activeTab === 'services' && <ServicesContent />}
 </div>

 {/* Mobile bottom tab bar */}
 <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 px-1 z-50 shadow-lg">
 {TABS.map((tab) => {
 const Icon = tab.icon
 const isActive = activeTab === tab.id
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex flex-col items-center justify-center p-1 min-w-[40px] ${
 isActive ? 'text-red-600' : 'text-gray-400'
 }`}
 >
 <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
 <span className="text-[10px] mt-0.5">{tab.label}</span>
 {isActive && <div className="w-1 h-1 bg-red-600 rounded-full mt-0.5" />}
 </button>
 )
 })}
 </div>
 </div>
 )
}
